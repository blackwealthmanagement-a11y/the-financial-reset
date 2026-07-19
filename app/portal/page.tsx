'use client';
import { useState } from 'react';
import Nav from '../components/Nav';

export default function Portal(){
 const [submitted,setSubmitted]=useState(false);
 async function handleSubmit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setSubmitted(true)}
 return <><Nav/><div className="form-shell">{submitted?<><div className="eyebrow">Intake received</div><h1 style={{fontSize:'3rem'}}>Your reset starts here.</h1><p>Thanks for completing the intake. The next production step is connecting this form to a database, email workflow, and Stripe checkout.</p><a className="button primary" href="/">Back Home</a></>:<><div className="eyebrow">Client intake</div><h1 style={{fontSize:'3rem'}}>Tell us about your goals.</h1><p>This starter form can later be connected to your CRM and automated onboarding.</p><form onSubmit={handleSubmit} className="form-grid"><label className="field"><span>First name</span><input required/></label><label className="field"><span>Last name</span><input required/></label><label className="field"><span>Email</span><input type="email" required/></label><label className="field"><span>Phone</span><input type="tel"/></label><label className="field full"><span>What do you need help with?</span><select required><option value="">Select one</option><option>Personal credit education</option><option>Business credit guidance</option><option>Financial wellness coaching</option><option>Not sure yet</option></select></label><label className="field full"><span>What is your main financial goal?</span><textarea placeholder="Example: prepare for a home purchase, improve credit habits, or build business funding readiness"/></label><div className="field full"><button className="button primary" type="submit">Submit Intake</button></div></form></>}</div></>
}
