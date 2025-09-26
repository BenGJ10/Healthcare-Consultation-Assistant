import os
from openai import OpenAI 
from pydantic import BaseModel # for request body validation
from fastapi.responses import StreamingResponse  # for streaming responses
from fastapi import FastAPI, Depends, HTTPException  
from sendgrid import SendGridAPIClient # for sending emails
from sendgrid.helpers.mail import Mail # for constructing email messages
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials   # for clerk authentication

app = FastAPI()

# Clerk authentication setup
clerk_config = ClerkConfig(jwks_url=os.getenv("CLERK_JWKS_URL"))
clerk_guard = ClerkHTTPBearer(clerk_config)

# BaseModel for request bodies
class Visit(BaseModel):
    patient_name: str
    date_of_visit: str
    notes: str
    doctor_name: str
    clinic_name: str

class EmailRequest(BaseModel):
    to_email: str
    date_of_visit: str
    subject: str
    content: str
    doctor_name: str
    clinic_name: str
    patient_name: str

# System prompt for the AI model
system_prompt = """
You are provided with notes written by a doctor from a patient's visit.
Your job is to generate a concise, patient-friendly email summarizing the visit and next steps.
Return plain text (no markdown headings, no 'in patient-friendly language' phrase, no subject line, no signature) with the following structure:
- Greeting: Address the patient by name (e.g., "Dear [Patient Name],").
- Visit Summary: Summarize the discussion from the notes in 1 clear sentence (max 20 words).
- Recommendations: Provide 3-6(depending on issue) brief, actionable bullets (use "-" for bullets, max 15-20 words each):
  - Medications prescribed or suggested, with simple dosage instructions. 
  - Safe alternative treatments or lifestyle adjustments (e.g., diet, home remedies).
  - Steps to prevent worsening of symptoms.
- When to Seek Care: State when to contact the clinic in 1 sentence (max 15 words).
- Follow-Up: Mention any follow-up actions in 1 sentence (max 15 words).
- Closing: Include a warm, polite closing (e.g., "Wishing you a speedy recovery,").
Do not include a subject line or signature, as these will be added separately.
The content must be 100% original, professional, warm, and written as if by a doctor, avoiding repetitive advice and overly technical or generic AI phrasing.
"""

# Function to create user prompt 
def user_prompt_for(visit: Visit) -> str:
    """
    Create a user prompt from the visit details. 
    This prompt will be sent to the AI model to generate the email content.
    """
    return f"""Create the draft email for:
                Patient Name: {visit.patient_name}
                Date of Visit: {visit.date_of_visit}
                Doctor: {visit.doctor_name}
                Clinic: {visit.clinic_name}
                Notes:
                {visit.notes}"""

# Endpoint to generate consultation summary
@app.post("/api")
def consultation_summary(
    visit: Visit,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):
    """
    Generate a patient-friendly consultation summary email using OpenAI's GPT-5 model.
    Streams the response back to the client as it's generated.
    """
    user_id = creds.decoded["sub"]  # Available for tracking/auditing
    client = OpenAI()               # OpenAI client initialization

    # Generate user prompt
    user_prompt = user_prompt_for(visit)

    prompt = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    # Create a streaming chat completion
    stream = client.chat.completions.create(
        model = "gpt-5-nano",
        messages = prompt,
        stream = True,
    )

    # Generator to yield streaming response
    def event_stream():
        for chunk in stream:
            text = chunk.choices[0].delta.content
            if text:
                lines = text.split("\n")
                for line in lines[:-1]:
                    yield f"data: {line}\n\n"
                    yield "data:  \n"
                yield f"data: {lines[-1]}\n\n"

    # 
    return StreamingResponse(event_stream(), media_type="text/event-stream")

# Endpoint to send the consultation summary email
@app.post("/send-email")
async def send_email(
    email: EmailRequest,
    creds: HTTPAuthorizationCredentials = Depends(clerk_guard),
):  
    """
    Send a consultation summary email to the patient using SendGrid.
    The email content is formatted in HTML for better readability.
    """
    try:
        # Convert bullet points to HTML list
        content_lines = email.content.split("\n")
        formatted_content = ""
        in_bullet_section = False
        for line in content_lines:
            if line.strip().startswith("- "):
                if not in_bullet_section:
                    formatted_content += "<ul style='margin: 16px 0; padding-left: 20px;'>"
                    in_bullet_section = True
                formatted_content += f"<li>{line.strip()[2:]}</li>"
            else:
                if in_bullet_section:
                    formatted_content += "</ul>"
                    in_bullet_section = False
                formatted_content += f"<p style='margin-bottom: 16px;'>{line}</p>"

        if in_bullet_section:
            formatted_content += "</ul>"

        # Create the email message
        message = Mail(
            from_email=os.getenv("FROM_EMAIL", "no-reply@yourclinic.com"),
            to_emails=email.to_email,
            subject=email.subject,
            html_content=f"""
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h1 style="color: #1e40af; font-size: 24px; margin-bottom: 20px;">HealthLetter</h1>
                <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #1e40af; font-size: 20px; margin-bottom: 16px;">Consultation Summary</h2>
                    {formatted_content}
                    <p style="margin-top: 20px; font-size: 14px; color: #4b5563;">
                        Best regards,<br>
                        Dr.{email.doctor_name}<br>
                        {email.clinic_name}
                    </p>
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px;">
                    This email was sent by HealthLetter. For questions, reply to this email or contact {email.clinic_name}.
                </p>
            </div>
            """
        )
        # Send the email using SendGrid
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        response = sg.send(message) # Get response for logging/debugging
        return {"status": "Email sent", "response": response.status_code} 
    
    except Exception as e:
        import traceback
        print(traceback.format_exc()) # Log the full traceback for debugging
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")