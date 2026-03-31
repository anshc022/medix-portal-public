"use client";

import { useState, useEffect } from 'react';
import { 
  PlusCircle, 
  List, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Activity, 
  FileText, 
  Paperclip,
  Network,
  ShieldAlert,
  Send,
  User,
  ShieldCheck,
  Stethoscope,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileImage,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('new');
  const [applications, setApplications] = useState<any[]>([]);
  const [agentLogs, setAgentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [createdCaseId, setCreatedCaseId] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');

  const [followUpText, setFollowUpText] = useState('');
  const [followUpFile, setFollowUpFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI State toggles
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [patientDetailsExpanded, setPatientDetailsExpanded] = useState(true);
  const [docPreviewExpanded, setDocPreviewExpanded] = useState(false);

  const loadApplications = async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (Array.isArray(data)) setApplications(data);
    } catch (e) {}
  };

  const loadLogs = async (appId: string) => {
    try {
      const res = await fetch(`/api/logs?application_id=${appId}`);
      const data = await res.json();
      if (Array.isArray(data)) setAgentLogs(data);
    } catch (e) {}
  };

  const deleteApplication = async (e: React.MouseEvent, appId: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete case ${appId}?`)) return;
    try {
      const res = await fetch(`/api/applications?application_id=${appId}`, { method: 'DELETE' });
      if (res.ok) {
        setApplications(applications.filter(app => app.application_id !== appId));
        if (selectedApp === appId) setSelectedApp(null);
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (activeTab === 'view') loadApplications();
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    if (selectedApp) {
      loadLogs(selectedApp);
      interval = setInterval(() => loadLogs(selectedApp), 3000);
      setPatientDetailsExpanded(true); // reset on new app select
      setDocPreviewExpanded(false);
    }
    return () => clearInterval(interval);
  }, [selectedApp]);

  const handleStep1Submit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/patient-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, prevent_cron: true })
      });
      const result = await res.json();
      if (result.success) {
        setCreatedCaseId(result.application_id);
        setStep(2);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
        setSelectedFile(e.target.files[0]);
        setUploadError('');
    }
  };

  const handleStep2Submit = async (e: any) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploadStatus(`Analyzing ${selectedFile.name}...`);
    setUploadError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('application_id', createdCaseId);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
          setUploadError(data.error || 'Failed to upload document');
          setUploadStatus('');
          setSelectedFile(null); // Force them to pick a new file
          return;
      }

      setUploadStatus('Document Verified. Initializing AI Engine...');
      
      try { 
        await fetch('/api/cron'); 
      } catch (e) {}
      
      setTimeout(() => {
        const targetApp = createdCaseId;
        setStep(1);
        setCreatedCaseId('');
        setUploadStatus('');
        setSelectedFile(null);
        setActiveTab('view');
        setSelectedApp(targetApp);
      }, 1500);

    } catch (err) {
      setUploadError('Network error uploading file');
      setUploadStatus('');
    }
  };

  const submitFollowUp = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      let infoStr = followUpText;

      if (followUpFile) {
        const formData = new FormData();
        formData.append('file', followUpFile);
        formData.append('application_id', selectedApp);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
            infoStr = `[Document Attached: ${followUpFile.name}] ${followUpText}`;
        }
      }

      await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: selectedApp, additional_info: infoStr })
      });
      setFollowUpText('');
      setFollowUpFile(null);
      loadLogs(selectedApp); 
      loadApplications();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveCaseHuman = async () => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: selectedApp })
      });
      loadLogs(selectedApp);
      loadApplications();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  const forceEvaluate = async () => {
    try {
      await fetch('/api/cron');
      loadLogs(selectedApp!);
      loadApplications();
    } catch (e) {}
  };

  const getAgentColor = (agentName: string) => {
    const colors: Record<string, string> = {
      'Medix': 'bg-blue-50 text-blue-700 border-blue-200',
      'Polaris': 'bg-purple-50 text-purple-700 border-purple-200',
      'Veritas': 'bg-rose-50 text-rose-700 border-rose-200',
      'Nexus': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Argus': 'bg-amber-50 text-amber-700 border-amber-200',
      'Provider': 'bg-slate-100 text-slate-700 border-slate-300',
      'Human Reviewer': 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
    return colors[agentName] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getFinalOutcome = () => {
    if (!agentLogs || agentLogs.length === 0) return null;
    
    // Check for approved
    const finalNexus = agentLogs.find(l => l.agent_name === 'Nexus' && l.log_message.includes('successfully submitted'));
    if (finalNexus) return { status: 'approved', message: 'Prior Authorization transmitted to Payer.' };

    // Check for explicit decision logs
    const veritasDecisions = agentLogs.filter(l => l.agent_name === 'Veritas' && l.log_message.includes('Final Assessment:'));
    
    if (veritasDecisions.length > 0) {
      const veritasDecision = veritasDecisions[veritasDecisions.length - 1]; 
      if (veritasDecision.log_message.includes('HUMAN_REVIEW')) return { status: 'human_review', message: 'AI criteria met. Awaiting human physician sign-off before transmission.' };
      if (veritasDecision.log_message.includes('DENIED')) return { status: 'denied', message: 'Prior Authorization Denied. Argus is drafting an appeal.' };
      if (veritasDecision.log_message.includes('MORE_INFO')) return { status: 'more_info', message: 'Incomplete Info. Argus has generated an RFI for the provider.' };
    }

    // Dynamic processing status based on the latest log
    const lastLog = agentLogs[agentLogs.length - 1];
    let dynamicMessage = 'Agents are actively reviewing the case...';
    if (lastLog.agent_name === 'Polaris') dynamicMessage = 'Polaris is cross-referencing payer policies...';
    if (lastLog.agent_name === 'Medix') dynamicMessage = 'Medix is extracting clinical symptoms from records...';
    if (lastLog.agent_name === 'Veritas') dynamicMessage = 'Veritas is evaluating step-therapy constraints...';
    if (lastLog.agent_name === 'Nexus') dynamicMessage = 'Nexus is structuring the FHIR submission package...';
    if (lastLog.agent_name === 'Argus') dynamicMessage = 'Argus is analyzing data for appeals/RFI...';

    return { status: 'processing', message: dynamicMessage };
  };

  const outcome = getFinalOutcome();
  const selectedAppData = applications.find(a => a.application_id === selectedApp);

  const documentName = selectedAppData?.document_url ? selectedAppData.document_url.split('/').pop() : (selectedAppData ? \`Clinical_Notes_\${selectedAppData.patient_name.replace(/\\s+/g, '_')}.pdf\` : "Medical_Record.pdf");
  const isImageDoc = documentName.toLowerCase().endsWith('.png') || documentName.toLowerCase().endsWith('.jpg') || documentName.toLowerCase().endsWith('.jpeg');


  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans overflow-hidden">
      <aside className={`bg-white border-r border-slate-200 flex flex-col fixed h-full z-40 shadow-sm transition-all duration-300 ease-in-out ${sidebarExpanded ? 'w-64 lg:w-72' : 'w-20'} hidden md:flex`}>
        <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shrink-0">M</div>
            {sidebarExpanded && (
              <div className="whitespace-nowrap overflow-hidden">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">MEDIX</h1>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Clinical AI</p>
              </div>
            )}
          </div>
          <button onClick={() => setSidebarExpanded(!sidebarExpanded)} className="text-slate-400 hover:text-slate-800 transition-colors p-1 rounded-md hover:bg-slate-100">
            {sidebarExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
          {sidebarExpanded && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">Workspaces</p>}
          <nav className="space-y-2">
            <button onClick={() => { setActiveTab('new'); setSelectedApp(null); setStep(1); setSelectedFile(null); setUploadError(''); }} className={`w-full flex items-center ${sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-3'} rounded-lg transition-all font-medium text-sm ${activeTab === 'new' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              <PlusCircle size={sidebarExpanded ? 18 : 22} className={activeTab === 'new' ? 'text-blue-600' : 'text-slate-400'} /> 
              {sidebarExpanded && <span>Intake New Case</span>}
            </button>
            <button onClick={() => { setActiveTab('view'); setSelectedApp(null); }} className={`w-full flex items-center ${sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-3 relative'} rounded-lg transition-all font-medium text-sm ${activeTab === 'view' && !selectedApp ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              <List size={sidebarExpanded ? 18 : 22} className={activeTab === 'view' && !selectedApp ? 'text-blue-600' : 'text-slate-400'} /> 
              {sidebarExpanded ? (
                <><span className="whitespace-nowrap">Active Queue</span><span className="ml-auto bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-full">{applications.length}</span></>
              ) : (<span className="absolute top-1.5 right-1.5 bg-slate-200 text-slate-700 text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{applications.length}</span>)}
            </button>
          </nav>
          <div className="mt-8">
            {sidebarExpanded && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">System Status</p>}
            <div className={`rounded-xl border border-slate-100 ${sidebarExpanded ? 'bg-slate-50 p-4' : 'p-2 flex flex-col items-center border-transparent'}`}>
               {sidebarExpanded ? (
                 <><div className="flex items-center gap-2 text-sm text-slate-700 mb-3"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Network Online</div><div className="space-y-2"><div className="flex items-center text-xs text-slate-500 whitespace-nowrap"><Network size={12} className="mr-2 text-slate-400" /> 5 Active Agents</div><div className="flex items-center text-xs text-slate-500 whitespace-nowrap"><ShieldCheck size={12} className="mr-2 text-slate-400" /> HIPAA Compliant</div></div></>
               ) : (<div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] mb-4"></div>)}
            </div>
          </div>
        </div>
        <div className={`p-4 border-t border-slate-100 flex items-center ${sidebarExpanded ? 'gap-3' : 'justify-center'}`}>
           <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 shrink-0"><User size={20} /></div>
           {sidebarExpanded && (<div className="whitespace-nowrap overflow-hidden"><p className="text-sm font-semibold text-slate-800">Dr. Smith</p><p className="text-xs text-slate-500">Lead Reviewer</p></div>)}
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-screen bg-slate-50/50 w-full transition-all duration-300 ease-in-out ${sidebarExpanded ? 'md:ml-64 lg:ml-72' : 'md:ml-20'}`}>
        {activeTab === 'new' && (
          <div className="p-4 md:p-8 max-w-3xl mx-auto w-full mt-4 overflow-y-auto">
            <div className="mb-8"><h2 className="text-3xl font-bold text-slate-900 tracking-tight">Patient Intake</h2><p className="text-slate-500 mt-2">Initialize a new prior authorization case via the AI evaluation engine.</p></div>
            <div className="flex items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>1</div>
              <div className="ml-3 text-sm font-medium text-slate-700">Clinical Data</div>
              <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>2</div>
              <div className="ml-3 text-sm font-medium text-slate-700">Supporting Docs</div>
            </div>
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"><div><label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name</label><input type="text" name="patient_name" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" /></div><div><label className="block text-sm font-semibold text-slate-700 mb-2">Age</label><input type="number" name="patient_age" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" /></div></div>
                <div className="mb-6"><label className="block text-sm font-semibold text-slate-700 mb-2">Insurance Payer</label><select name="insurance_payer" required defaultValue="" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"><option value="" disabled>Select Payer...</option><option value="Anthem BCBS">Anthem BCBS</option><option value="UnitedHealthcare">UnitedHealthcare</option><option value="Cigna">Cigna</option><option value="Aetna">Aetna</option><option value="Medicare">Medicare</option></select></div>
                <div className="mb-6"><label className="block text-sm font-semibold text-slate-700 mb-2">Symptoms & Context</label><textarea name="symptoms" required rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none resize-none"></textarea></div>
                <div className="mb-8"><label className="block text-sm font-semibold text-slate-700 mb-2">Requested Procedure/Treatment</label><input type="text" name="treatment" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none" /></div>
                <div className="flex justify-end pt-4 border-t border-slate-100"><button type="submit" disabled={loading} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-sm flex justify-center items-center disabled:opacity-50">{loading ? 'Creating Record...' : 'Continue to Documents'} <ArrowRightIcon /></button></div>
              </form>
            )}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                <div className="mb-6 flex flex-col items-center"><div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4"><FileText size={24} /></div><h3 className="text-lg font-bold text-slate-900">Upload Clinical Evidence</h3><p className="text-sm text-slate-500 mt-1 max-w-sm">Case <span className="font-mono bg-slate-100 px-1 rounded">{createdCaseId}</span> is ready. Attach medical history, lab results, or doctor notes for AI analysis.</p></div>
                
                {uploadError && (
                  <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start text-left gap-3">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div><span className="font-bold block mb-1">OCR Validation Failed</span>{uploadError}</div>
                  </div>
                )}

                <div className={`border-2 border-dashed rounded-2xl p-10 mb-8 transition-all cursor-pointer relative ${selectedFile && !uploadError ? 'border-emerald-400 bg-emerald-50/50' : uploadError ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}>
                  <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.png,.jpg,.jpeg" required />
                  {!selectedFile ? (<div className="text-slate-400 flex flex-col items-center"><Paperclip size={32} className="mb-3 text-slate-300" /><p className="text-sm font-medium text-slate-700 mb-1">Click to browse or drag and drop</p><p className="text-xs">PDF, PNG, JPG (Max 10MB)</p></div>) : (<div className={`${uploadError ? 'text-rose-600' : 'text-emerald-600'} flex flex-col items-center`}><CheckCircle2 size={32} className="mb-3" /><p className="text-sm font-medium text-slate-800 mb-1">File Selected</p><p className={`text-xs font-mono px-2 py-1 rounded ${uploadError ? 'bg-rose-100' : 'bg-emerald-100'}`}>{selectedFile.name}</p></div>)}
                </div>
                {uploadStatus && (<div className="mb-6 text-blue-600 text-sm font-medium flex items-center justify-center gap-2"><Activity size={16} className="animate-pulse" /> {uploadStatus}</div>)}
                <button type="submit" disabled={!selectedFile || !!uploadStatus} className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-medium transition-all shadow-md flex items-center justify-center disabled:opacity-50">{uploadStatus ? 'Processing...' : 'Run Medix AI Pipeline'}</button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'view' && !selectedApp && (
          <div className="p-4 md:p-8 w-full max-w-6xl mx-auto mt-4 overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
              <div><h2 className="text-3xl font-bold text-slate-900 tracking-tight">Active Queue</h2><p className="text-slate-500 mt-2">Monitor and manage automated authorization pipelines.</p></div>
              <button onClick={loadApplications} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm flex items-center gap-2">Refresh Board</button>
            </div>
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {applications.map((app: any) => (
                <div key={app.id} onClick={() => setSelectedApp(app.application_id)} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full relative">
                  <button onClick={(e) => deleteApplication(e, app.application_id)} className="absolute top-4 right-4 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 w-8 h-8 rounded-lg flex items-center justify-center transition-colors border border-transparent hover:border-rose-200 opacity-0 group-hover:opacity-100 z-10"><Trash2 size={16} /></button>
                  <div className="flex items-center space-x-2 mb-3"><span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">{app.application_id}</span></div>
                  <div className="mb-4 pr-6"><h3 className="font-bold text-slate-900 text-lg leading-tight">{app.patient_name}</h3><p className="text-slate-500 text-sm mt-1">{app.patient_age}y • {app.insurance_payer}</p></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-5 flex-1"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Stethoscope size={10} /> Requested Tx</p><p className="text-slate-700 text-sm font-medium">{app.requested_treatment}</p></div>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100"><p className="text-xs text-slate-400 font-medium">{new Date(app.created_at).toLocaleDateString()}</p><span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${app.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : app.status === 'review' ? 'bg-blue-50 text-blue-700 border-blue-200' : app.status === 'human_review' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : app.status === 'more_info' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{app.status === 'pending' ? 'Waiting' : app.status === 'review' ? 'AI Processing' : app.status === 'human_review' ? 'Needs Review' : app.status === 'more_info' ? 'Action Req' : app.status}</span></div>
                </div>
              ))}
              {applications.length === 0 && (<div className="col-span-full text-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl"><div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><List size={24} /></div><h3 className="text-lg font-bold text-slate-700">Queue Empty</h3><p className="text-slate-500 text-sm mt-1">No active cases requiring attention.</p></div>)}
            </div>
          </div>
        )}

        {activeTab === 'view' && selectedApp && (
          <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
            <div className="border-b border-slate-200 px-4 md:px-6 py-3 flex flex-wrap gap-4 justify-between items-center bg-white z-20 shadow-sm shrink-0">
              <div className="flex items-center gap-2 md:gap-4">
                <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-800 transition-colors p-1.5 hover:bg-slate-100 rounded-lg shrink-0"><ArrowLeftIcon /></button>
                <div className="flex items-center flex-wrap gap-2"><h2 className="font-bold text-slate-900 text-base md:text-lg">Case Review</h2><span className="bg-slate-100 text-slate-500 font-mono text-[10px] md:text-xs px-2 py-0.5 rounded border border-slate-200">{selectedApp}</span></div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 ml-auto">
                <button onClick={forceEvaluate} className="bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-colors border border-slate-200 shadow-sm flex items-center gap-2"><RefreshCw size={12}/> Force Eval</button>
                <div className="flex items-center gap-1.5 md:gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100"><div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[9px] md:text-[10px] font-bold text-emerald-700 uppercase tracking-widest hidden sm:inline-block">Live Sync</span></div>
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 min-h-0 relative">
              <div className="flex-1 flex flex-col border-r border-slate-200 overflow-hidden bg-white relative">
                {selectedAppData && (
                  <div className="bg-white border-b border-slate-200 shrink-0 shadow-sm z-10">
                    <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setPatientDetailsExpanded(!patientDetailsExpanded)}>
                       <div className="flex items-center gap-4">
                         <div className="flex flex-col"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Patient</p><p className="text-slate-900 font-bold text-sm">{selectedAppData.patient_name} <span className="text-slate-500 font-normal">({selectedAppData.patient_age}y)</span></p></div>
                         <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                         <div className="flex-col hidden sm:flex"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Requested</p><p className="text-slate-900 font-semibold text-sm">{selectedAppData.requested_treatment}</p></div>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 hidden md:flex"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span><p className="text-blue-700 text-xs font-semibold">{selectedAppData.insurance_payer}</p></div>
                         <button className="text-slate-400 hover:text-slate-700 p-1 bg-slate-50 rounded">{patientDetailsExpanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
                       </div>
                    </div>
                    {patientDetailsExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-slate-50/50 border-t border-slate-50 flex flex-col md:flex-row gap-4">
                         <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Info size={12}/> Extracted Condition</p><p className="text-sm text-slate-700 leading-relaxed font-medium">{selectedAppData.diagnosis_description || selectedAppData.clinical_notes || "Symptoms extracted from intake..."}</p></div>
                         <div className="w-full md:w-64 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                           <div className="p-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 cursor-pointer hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); setDocPreviewExpanded(!docPreviewExpanded); }}>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileImage size={12} className="text-blue-500" /> Evidence Docs</p>
                             {docPreviewExpanded ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                           </div>
                           <div className="p-3 bg-white">
                             {selectedAppData.document_url ? (
                               <a href={selectedAppData.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                                 <FileText size={16} className="text-blue-500" />
                                 <span className="text-xs font-mono text-blue-700 truncate flex-1 group-hover:underline">{documentName}</span>
                                 <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-500" />
                               </a>
                             ) : (
                               <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg"><FileText size={16} className="text-slate-400" /><span className="text-xs font-mono text-slate-600 truncate flex-1">{documentName}</span><span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">PDF</span></div>
                             )}
                           </div>
                           {docPreviewExpanded && selectedAppData.document_url && (
                             <div className="h-40 bg-slate-200 border-t border-slate-200 p-2 overflow-hidden relative flex items-center justify-center">
                               {isImageDoc ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={selectedAppData.document_url} alt="Document Preview" className="max-h-full max-w-full object-contain shadow-sm border border-slate-300 rounded bg-white" />
                               ) : (
                                 <iframe src={`${selectedAppData.document_url}#toolbar=0&navpanes=0`} className="w-full h-full border border-slate-300 rounded shadow-sm bg-white" />
                               )}
                             </div>
                           )}
                           {docPreviewExpanded && !selectedAppData.document_url && (
                              <div className="h-32 bg-slate-200 border-t border-slate-200 p-2 overflow-hidden relative">
                               <div className="absolute inset-0 bg-white m-2 shadow border border-slate-300 rounded p-2 text-[8px] text-slate-400 font-mono leading-tight overflow-hidden break-words whitespace-pre-wrap">
                                 [DOCUMENT NOT FOUND OR UPLOADED YET]
                               </div>
                             </div>
                           )}
                         </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-white">
                    <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/90 backdrop-blur pb-2 z-10"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Network size={12} /> Execution Timeline</h3></div>
                    {agentLogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 py-10 h-full"><Activity size={32} className="mb-4 animate-pulse text-blue-400" /><p className="text-sm font-medium">Initializing AI Evaluators...</p></div>
                    ) : (
                      <div className="space-y-4 md:space-y-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent pt-2">
                        {agentLogs.map((log: any, idx) => (
                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                               {log.agent_name === 'Veritas' ? <Activity size={14} className="text-rose-500" /> : log.agent_name === 'Polaris' ? <FileText size={14} className="text-purple-500" /> : log.agent_name === 'Nexus' ? <Send size={14} className="text-emerald-500" /> : log.agent_name === 'Argus' ? <AlertCircle size={14} className="text-amber-500" /> : log.agent_name === 'Human Reviewer' ? <User size={14} className="text-indigo-500" /> : log.agent_name === 'Provider' ? <Stethoscope size={14} className="text-slate-500" /> : <ShieldCheck size={14} className="text-blue-500" />}
                            </div>
                            <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2.5rem)]">
                              <div className={`p-3 md:p-4 rounded-xl border shadow-sm transition-all ${getAgentColor(log.agent_name)}`}>
                                <div className="flex justify-between items-center mb-1.5 md:mb-2"><span className="font-bold text-[10px] md:text-xs uppercase tracking-wide opacity-80">{log.agent_name}</span><span className="text-[9px] md:text-[10px] font-mono opacity-60">{new Date(log.created_at).toLocaleTimeString()}</span></div>
                                <p className={`text-xs md:text-sm break-words whitespace-pre-wrap leading-relaxed ${log.log_message.includes('APPROVED') ? 'font-bold' : ''} ${log.log_message.includes('DENIED') ? 'font-bold' : ''} ${log.log_message.includes('HUMAN_REVIEW') ? 'font-bold' : ''}`}>{log.log_message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div className="w-full lg:w-[22rem] xl:w-96 bg-white flex flex-col z-20 shrink-0 border-t lg:border-t-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
                <div className="p-4 border-b border-slate-200 bg-white"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><ShieldAlert size={14} /> Final Determination</h3></div>
                <div className="p-4 md:p-6 flex-1 flex flex-col overflow-y-auto bg-slate-50/30">
                  {outcome ? (
                    <div className="flex-1 flex flex-col">
                      <div className={`p-4 md:p-5 rounded-2xl border mb-6 shadow-sm flex flex-col items-center text-center ${outcome.status === 'processing' ? 'bg-white border-blue-100' : outcome.status === 'human_review' ? 'bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-200' : outcome.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : outcome.status === 'denied' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="mb-2 md:mb-3">
                          {outcome.status === 'processing' && <Activity size={28} className="text-blue-500 animate-pulse" />}
                          {outcome.status === 'human_review' && <User size={28} className="text-indigo-100" />}
                          {outcome.status === 'approved' && <CheckCircle2 size={28} className="text-emerald-500" />}
                          {outcome.status === 'denied' && <XCircle size={28} className="text-rose-500" />}
                          {outcome.status === 'more_info' && <AlertCircle size={28} className="text-amber-500" />}
                        </div>
                        <h4 className={`font-bold text-lg md:text-xl mb-1.5 md:mb-2 ${outcome.status === 'processing' ? 'text-blue-900' : outcome.status === 'human_review' ? 'text-white' : outcome.status === 'approved' ? 'text-emerald-900' : outcome.status === 'denied' ? 'text-rose-900' : 'text-amber-900'}`}>
                          {outcome.status === 'processing' ? 'Evaluating Details...' : outcome.status === 'human_review' ? 'Review Required' : outcome.status === 'approved' ? 'Authorization Approved' : outcome.status === 'denied' ? 'Authorization Denied' : 'Information Missing'}
                        </h4>
                        <p className={`text-xs md:text-sm ${outcome.status === 'human_review' ? 'text-indigo-100' : 'text-slate-600'}`}>{outcome.message}</p>
                      </div>

                      {outcome.status === 'human_review' && (
                        <div className="mt-auto flex flex-col bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-xs text-indigo-600 font-bold mb-2 md:mb-3 uppercase tracking-wider flex items-center gap-2"><CheckCircle2 size={14}/> Sign-off Required</p>
                          <p className="text-slate-600 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed">AI logic has verified medical necessity. Your digital signature is required to generate and transmit the final FHIR payload.</p>
                          <button onClick={approveCaseHuman} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm py-3 md:py-4 rounded-xl transition-all disabled:opacity-50 mt-auto shadow-sm flex justify-center items-center gap-2">{isSubmitting ? 'Signing...' : <><Send size={16} /> Approve & Transmit</>}</button>
                        </div>
                      )}

                      {outcome.status === 'more_info' && (
                        <div className="mt-auto flex flex-col bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-xs text-amber-600 font-bold mb-2 md:mb-3 uppercase tracking-wider">Provide Addt'l Context</p>
                          <div className="flex flex-col gap-2 md:gap-3">
                            <textarea value={followUpText} onChange={(e) => setFollowUpText(e.target.value)} placeholder="Type missing clinical info here..." className="w-full h-20 md:h-24 p-2 md:p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs md:text-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"></textarea>
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5 md:p-2"><input type="file" id="followup-file" className="hidden" onChange={(e) => { if(e.target.files) setFollowUpFile(e.target.files[0]) }} /><label htmlFor="followup-file" className="text-xs md:text-sm font-medium text-slate-600 cursor-pointer hover:text-amber-600 flex items-center px-2 py-1 transition-colors w-full"><Paperclip size={14} className="mr-2 shrink-0" /> <span className="truncate">{followUpFile ? followUpFile.name : 'Attach Additional File'}</span></label></div>
                            <button onClick={submitFollowUp} disabled={isSubmitting || (!followUpText && !followUpFile)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs md:text-sm py-2.5 md:py-3.5 rounded-xl transition-all disabled:opacity-50 mt-1 md:mt-2 shadow-sm">{isSubmitting ? 'Submitting...' : 'Submit to AI Engine'}</button>
                          </div>
                        </div>
                      )}

                      {outcome.status === 'approved' && (
                        <div className="mt-auto bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-xs text-slate-400 font-bold mb-2 md:mb-3 uppercase tracking-wider">Transmitted Payload</p>
                          <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100 text-emerald-600 text-[10px] md:text-xs font-mono break-all line-clamp-6 mb-3 md:mb-4 overflow-y-auto max-h-40">
                            {agentLogs.find(l => l.agent_name === 'Nexus')?.log_message.replace('FHIR Payload successfully submitted to payer endpoint:\n', '') || '{"resourceType": "Claim", "status": "active"}'}
                          </div>
                          <div className="w-full bg-emerald-50 text-emerald-700 font-semibold text-xs md:text-sm py-2.5 md:py-3 rounded-xl border border-emerald-200 flex justify-center items-center gap-2"><CheckCircle2 size={16} /> Successfully Transmitted</div>
                        </div>
                      )}

                      {outcome.status === 'denied' && (
                        <div className="mt-auto bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                          <p className="text-xs text-slate-400 font-bold mb-2 md:mb-3 uppercase tracking-wider">Generated Appeal Draft</p>
                          <div className="bg-rose-50/50 p-3 md:p-4 rounded-xl border border-rose-100 text-slate-700 text-xs md:text-sm font-serif italic mb-3 md:mb-4 line-clamp-4 md:line-clamp-5">"Appeal for Case {selectedApp}: The patient's condition meets the spirit of medical necessity. Clinical evidence attached shows significant deterioration despite prior interventions..."</div>
                          <button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs md:text-sm py-2.5 md:py-3.5 rounded-xl transition-all shadow-sm">Submit Appeal Packet</button>
                        </div>
                      )}
                    </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400"><ShieldCheck size={40} className="mb-3 md:mb-4 text-slate-200" /><p className="text-xs md:text-sm font-medium">Awaiting Pipeline Execution</p></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path></svg>;
