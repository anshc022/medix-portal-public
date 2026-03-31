"use client";

import { useState } from 'react';

export default function PatientPortal() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [diagnosisInfo, setDiagnosisInfo] = useState({ code: '', term: '' });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/patient-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      
      if (result.success) {
        setSuccess(true);
        setDiagnosisInfo({ code: result.assigned_icd, term: result.medical_term });
      }
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        
        <div className="bg-blue-600 p-8 text-center text-white">
          <h1 className="text-3xl font-black mb-2">Medix Patient Portal</h1>
          <p className="text-blue-100">Simple, Fast, Medical Approvals.</p>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Request Submitted!</h2>
              <p className="text-gray-600 mb-8">Our AI has translated your symptoms into medical codes for your insurance company.</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left max-w-sm mx-auto mb-8">
                <p className="text-sm text-gray-500 font-bold uppercase mb-1">AI Translation</p>
                <p className="text-gray-800 font-medium">Medix detected: <span className="text-blue-600">{diagnosisInfo.term}</span></p>
                <p className="text-gray-800 font-medium">Insurance Code: <span className="font-mono bg-gray-200 px-2 rounded text-sm">{diagnosisInfo.code}</span></p>
              </div>

              <button onClick={() => setSuccess(false)} className="text-blue-600 font-bold hover:underline">
                Submit Another Request
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-8 text-center">Just tell us what you're feeling in plain English. Our AI will handle the complicated doctor codes.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                    <input type="text" name="patient_name" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Age</label>
                    <input type="number" name="patient_age" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Insurance Provider</label>
                  <select name="insurance_payer" required defaultValue="" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="" disabled>Select your insurance...</option>
                    <option value="Anthem BCBS">Anthem BCBS</option>
                    <option value="UnitedHealthcare">UnitedHealthcare</option>
                    <option value="Cigna">Cigna</option>
                    <option value="Aetna">Aetna</option>
                    <option value="Humana">Humana</option>
                    <option value="Medicare">Medicare</option>
                    <option value="Medicaid">Medicaid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">What are your symptoms?</label>
                  <p className="text-xs text-gray-500 mb-2">Explain in plain English (e.g., "My lower back has been hurting for 3 weeks and nothing helps")</p>
                  <textarea name="symptoms" required rows={3} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">What treatment did your doctor suggest?</label>
                  <p className="text-xs text-gray-500 mb-2">Optional (e.g., "Physical therapy", "An MRI scan")</p>
                  <input type="text" name="treatment" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-colors flex justify-center items-center"
                >
                  {loading ? 'AI is processing...' : 'Submit to Medix AI'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
