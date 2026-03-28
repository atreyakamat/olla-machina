const API_URL = 'http://localhost:3001/api';

export async function subscribeToAlerts(email: string, fingerprint: any) {
  const response = await fetch(`${API_URL}/subscriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      fingerprint: fingerprint.hardware,
      fingerprint_id: fingerprint.fingerprint_id
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to subscribe');
  }
  
  return response.json();
}

export async function fetchBenchmarks(modelId?: string) {
  const url = modelId 
    ? `${API_URL}/benchmarks?modelId=${modelId}`
    : `${API_URL}/benchmarks`;
    
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch benchmarks');
  
  return response.json();
}
