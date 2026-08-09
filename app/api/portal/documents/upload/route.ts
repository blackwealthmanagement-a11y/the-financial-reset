import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SECRET_KEY;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain'
]);
const ALLOWED_CATEGORIES = new Set([
  'identity',
  'proof_of_address',
  'credit_report',
  'income',
  'tax',
  'banking',
  'business',
  'agreement',
  'other'
]);

function getFileExtension(fileName: string) {
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() || 'bin';
}

function toSafeDocumentMetadata(documentRow: Record<string, unknown>) {
  const { storage_path: _storagePath, ...rest } = documentRow;
  return rest;
}

function reject(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return reject('Server configuration error.', 500);
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return reject('Authentication required.', 401);
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error: userError } = await authClient.auth.getUser(accessToken);
  if (userError || !user) {
    return reject('Authentication failed.', 401);
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const rawCategory = formData.get('category');

  if (!(file instanceof File)) {
    return reject('Please select a file to upload.', 400);
  }

  const category = typeof rawCategory === 'string' ? rawCategory.trim() : 'other';
  if (!category || category.length > 64 || !ALLOWED_CATEGORIES.has(category)) {
    return reject('Invalid category.', 400);
  }

  if (file.size <= 0) {
    return reject('Please select a file to upload.', 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return reject('File must be 5 MB or smaller.', 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return reject('This file type is not supported.', 400);
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: clientData, error: clientError } = await adminClient.from('clients').select('id, lead_id').eq('auth_user_id', user.id).maybeSingle();
  if (clientError || !clientData) {
    return reject('We could not find your client profile.', 404);
  }

  const trimmedOriginalName = file.name.trim() || 'document';
  const fileName = `${crypto.randomUUID()}.${getFileExtension(trimmedOriginalName)}`;
  const storagePath = `clients/${clientData.id}/${fileName}`;

  const storageUpload = await adminClient.storage.from('client-documents').upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined
  });

  if (storageUpload.error) {
    return reject('We could not store the file securely.', 500);
  }

  const { data: insertedDocument, error: insertError } = await adminClient.from('client_documents').insert({
    client_id: clientData.id,
    lead_id: clientData.lead_id,
    file_name: fileName,
    original_file_name: trimmedOriginalName,
    storage_path: storagePath,
    mime_type: file.type || 'application/octet-stream',
    file_size: file.size,
    category,
    status: 'uploaded',
    uploaded_by: 'client'
  }).select('*').single();

  if (insertError || !insertedDocument) {
    const cleanupResult = await adminClient.storage.from('client-documents').remove([storagePath]);
    if (cleanupResult.error) {
      console.error('Document cleanup failed after metadata insert error.', cleanupResult.error);
    }
    return reject('We could not save the document entry.', 500);
  }

  const { error: activityError } = await adminClient.from('crm_lead_activity').insert({
    lead_id: clientData.lead_id,
    activity_type: 'document',
    message: `Client uploaded "${trimmedOriginalName}"`,
    created_by: 'client'
  });

  if (activityError) {
    console.error('Document activity logging failed.', activityError);
  }

  return NextResponse.json({
    ok: true,
    document: toSafeDocumentMetadata(insertedDocument as Record<string, unknown>),
    message: 'Document uploaded successfully.'
  });
}
