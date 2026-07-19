import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(){
  if(!process.env.STRIPE_SECRET_KEY){
    return NextResponse.json({error:'Add STRIPE_SECRET_KEY to enable checkout.'},{status:500});
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode:'payment',
    line_items:[{price_data:{currency:'usd',product_data:{name:'Financial Reset Consultation'},unit_amount:9900},quantity:1}],
    success_url:`${process.env.NEXT_PUBLIC_SITE_URL}/portal?success=true`,
    cancel_url:`${process.env.NEXT_PUBLIC_SITE_URL}/portal?canceled=true`
  });
  return NextResponse.json({url:session.url});
}
