import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const adminUserId = process.env.ADMIN_USER_ID || '61058da7-5a59-46c7-a115-ad74eec69213';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]);

function buildJsonResponse(payload: unknown, status = 200) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length);
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getAuthenticatedAdminUser(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Storage unavailable.' as string | null };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user?.id) {
    return { user: null, error: 'Permission denied.' };
  }

  if (user.id !== adminUserId) {
    return { user: null, error: 'Permission denied.' };
  }

  return { user, error: null };
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return buildJsonResponse({ error: 'Permission denied.' }, 401);
    }

    const { user, error: authError } = await getAuthenticatedAdminUser(token);
    if (authError || !user) {
      return buildJsonResponse({ error: authError || 'Permission denied.' }, 401);
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
      return buildJsonResponse({ error: 'Storage unavailable.' }, 503);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const leadId = formData.get('leadId')?.toString().trim();
    const clientId = formData.get('clientId')?.toString().trim();
    const category = formData.get('category')?.toString().trim();

    if (!leadId || !isValidUuid(leadId)) {
      return buildJsonResponse({ error: 'Invalid lead selection.' }, 400);
    }

    if (!clientId || !isValidUuid(clientId)) {
      return buildJsonResponse({ error: 'Invalid client selection.' }, 400);
    }

    if (!category) {
      return buildJsonResponse({ error: 'Please choose a document category.' }, 400);
    }

    const validCategories = ['identity', 'proof_of_address', 'credit_report', 'income', 'tax', 'banking', 'business', 'agreement', 'other'];
    if (!validCategories.includes(category)) {
      return buildJsonResponse({ error: 'Please choose a valid document category.' }, 400);
    }

    if (!(file instanceof File)) {
      return buildJsonResponse({ error: 'Please choose a file to upload.' }, 400);
    }

    if (!file.name) {
      return buildJsonResponse({ error: 'Invalid file.' }, 400);
    }

    if (file.size <= 0) {
      return buildJsonResponse({ error: 'Invalid file.' }, 400);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return buildJsonResponse({ error: 'Unsupported file type.' }, 415);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return buildJsonResponse({ error: 'File is too large. Maximum size is 5 MB.' }, 413);
    }

    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const { data: clientRecord, error: clientLookupError } = await adminClient
      .from('clients')
      .select('id, lead_id')
      .eq('id', clientId)
      .eq('lead_id', leadId)
      .maybeSingle();

    if (clientLookupError || !clientRecord) {
      return buildJsonResponse({ error: 'This lead is not linked to a client profile.' }, 404);
    }

    const originalFileName = file.name.trim();
    const sanitizedName = sanitizeFileName(originalFileName);
    const safeFileName = sanitizedName || 'document';
    const storagePath = `clients/${clientId}/${crypto.randomUUID()}-${safeFileName}`;

    const { data: existingDuplicate, error: duplicateLookupError } = await adminClient
      .from('client_documents')
      .select('id')
      .eq('lead_id', leadId)
      .ilike('original_file_name', originalFileName)
      .maybeSingle();

    if (duplicateLookupError) {
      console.error('Duplicate document lookup failed.', duplicateLookupError);
    }

    if (existingDuplicate) {
      return buildJsonResponse({ error: 'A document with that filename already exists.' }, 409);
    }

    const storageResult = await adminClient.storage.from('client-documents').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream'
    });

    if (storageResult.error) {
      console.error('Document storage upload failed.', storageResult.error);
      return buildJsonResponse({ error: 'Upload failed.' }, 500);
    }

    const { data: insertedDocument, error: insertError } = await adminClient
      .from('client_documents')
      .insert({
        client_id: clientId,
        lead_id: leadId,
        storage_path: storagePath,
        file_name: safeFileName,
        original_file_name: originalFileName,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        category,
        status: 'uploaded',
        uploaded_by: 'admin'
      })
      .select('*')
      .single();

    if (insertError || !insertedDocument) {
      console.error('Document metadata insert failed.', insertError);
      const cleanupResult = await adminClient.storage.from('client-documents').remove([storagePath]);
      if (cleanupResult.error) {
        console.error('Document cleanup failed after metadata insert error.', cleanupResult.error);
      }
      return buildJsonResponse({ error: 'Upload failed.' }, 500);
    }

    const { error: activityError } = await adminClient.from('crm_lead_activity').insert({
      lead_id: leadId,
      activity_type: 'document',
      message: `Uploaded "${originalFileName}"`,
      created_by: 'admin'
    });

    if (activityError) {
      console.error('CRM document activity logging failed.', activityError);
    }

    const publicDocument = (() => {
      const { storage_path: _storagePath, ...rest } = insertedDocument as Record<string, unknown>;
      return rest as typeof insertedDocument;
    })();

    return buildJsonResponse({
      ok: true,
      document: publicDocument
    });
  } catch (error) {
    console.error('CRM document upload failed.', error);
    return buildJsonResponse({ error: 'Upload failed.' }, 500);
  }
}
