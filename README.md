# 🏥 Medix AI: Automated Prior Authorization Management Portal

<p align="center">
  <em>An enterprise-scale, AI-powered Prior Authorization (PA) Management platform built for the <strong>Virtusa Jatayu Hackathon</strong>.</em>
</p>

---

## 🚀 Live Demo
**Live Website:** [http://13.51.121.121:3000](http://13.51.121.121:3000)

*(Note: The platform is currently hosted on an AWS EC2 instance. For full functionality, ensure your hospital firewall allows traffic to port 3000).*

---

## 🎯 The Goal & Purpose
Processing medical prior authorizations manually—extracting clinical evidence from unstructured faxes or handwritten notes and cross-referencing against complex payer rules—is incredibly time-consuming, prone to human error, and leads to severe patient care delays. 

**Medix AI** automates this workflow. It takes patient intake data and unstructured clinical evidence, uses **Vision OCR** to parse them, and runs them through a **Multi-Agent Swarm AI** to evaluate against insurance policies. The result is a deterministic verdict: **APPROVE**, **DENY**, or request **MORE INFO (RFI)**, complete with a structured HIPAA-compliant audit trail.

---

## 👨‍💻 Meet the Team (Team Avengers)
*   **Pranshu Chourasia** – Lead Architect & Backend Developer
*   **Ganesh** – Frontend & UI/UX Developer
*   **Divesh** – Integration & Solutions Engineer
*   **Jeevika** – API & Environment Configurations Specialist

---

## ⚙️ Tech Stack & Infrastructure
*   **Frontend & API:** Next.js (App Router), React, Tailwind CSS, Recharts.
*   **Database:** NeonDB Serverless PostgreSQL (PgBouncer connection pooling).
*   **AI Engine:** Google Gemini 2.0 Flash Vision (Multi-modal OCR and logic).
*   **Deployment:** AWS EC2 Ubuntu Instance.
*   **Process Management:** PM2 (Cluster Mode).
*   **Data Integration:** Asynchronous Cron Polling & RESTful Webhooks.

---

## 🧠 The Multi-Agent Swarm Architecture
Instead of relying on a monolithic Large Language Model (which risks clinical hallucinations), Medix isolates responsibilities into **4 specialized sub-agents**:

1.  **Medix (Lead Orchestrator):** Generates the clinical extraction (symptoms, timeline) and enforces a strict Verification Gate before finalizing any response.
2.  **Polaris (The Knowledge Base):** Retrieves exact insurance policy rules from the database (RAG).
3.  **Veritas (The Decision Engine):** Compares patient evidence against Polaris's rules. Outputs a strict JSON array of gap analyses and a calculated **Confidence Score (0-100)**.
4.  **Nexus (The Exporter):** Formats the approved payload into a structured, FHIR-ready JSON format for secure hospital EMR integration.
5.  **Argus (The Appeals Engine):** Automatically drafts formal Appeal Letters or RFIs if Veritas denies a claim or requires more evidence.

---

## 🚦 Smart Escalation Router (Human-in-the-Loop)
Medix AI never makes binary "Yes/No" decisions on ambiguous cases. The system utilizes an intelligent escalation router:
*   **Auto-Approve:** Confidence > 85% and all mandatory criteria pass.
*   **Auto-RFI:** Confidence 60-85% OR missing evidence.
*   **Human Escalation:** If confidence < 60%, cost exceeds the threshold, or there is a history of prior denials, the case is frozen and routed to the **Physician Reviewer UI** for manual oversight.

---

## 💻 Working Model (How to use the Portal)
1. **Patient Intake (Ingest Case):** Navigate to the dashboard. The provider inputs plain English symptoms. The AI automatically maps this unstructured text to precise ICD-10 codes.
2. **Upload Evidence:** The provider uploads clinical PDFs, images, or raw notes.
3. **Automated Adjudication:** The backend cron job (`/api/cron/route.ts`) triggers the Swarm AI in the background. It reads the files via Gemini OCR and checks compliance.
4. **View Verdicts & Analytics:** The Mission Control dashboard displays live terminal tracking, real-time analytics (recharts), and the final output (Approved/Denied).
5. **Appeals & FHIR:** View the automatically generated RFI/Appeal draft or the FHIR transmission payload on the same dashboard.

---

## 🔐 Security & Compliance
*   **PHI Masking:** Patient Health Information is stripped before external AI processing.
*   **Immutable Audit Trail:** All decisions are securely logged in a PostgreSQL `agent_logs` table.
*   **Parameterization:** Strictly protected against SQL injection via parameterized DB inputs.

---

*Built with ❤️ for Virtusa Jatayu.*
