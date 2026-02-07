import { supabase } from '../supabaseClient';

const BASE_URL = 'https://eqhuacksgeqywlvtyely.supabase.co/functions/v1';

export async function callEdge<T = any>(functionName: string, body: object = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const jwt = session?.access_token;
  if (!jwt) throw new Error('Not authenticated');

  const response = await fetch(`${BASE_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Function call failed');
  }
  return data;
}