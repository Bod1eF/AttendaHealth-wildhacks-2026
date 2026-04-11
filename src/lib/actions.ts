import { supabase } from './supabase'

export async function acceptRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('requests')
    .update({
      status: 'on_the_way',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function resolveRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('requests')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function togglePin(requestId: string, isPinned: boolean): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('requests')
    .update({
      is_pinned: isPinned,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
