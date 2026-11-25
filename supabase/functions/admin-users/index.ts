import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const allowedModules = new Set([
  'requests',
  'flood-monitor',
  'map',
  'shelters',
  'supplies',
  'volunteers',
  'announcements',
]);

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validateModules(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every((module) => typeof module === 'string' && allowedModules.has(module));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond(401, { error: 'Authentication required' });

  const projectUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!projectUrl || !anonKey || !serviceRoleKey) {
    return respond(500, { error: 'Supabase function secrets are not configured' });
  }

  const token = authorization.slice('Bearer '.length);
  const authClient = createClient(projectUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Invalid session' });

  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actor, error: actorError } = await adminClient
    .from('admin_profiles')
    .select('role, is_active')
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (actorError) return respond(500, { error: actorError.message });
  if (!actor || actor.role !== 'superadmin' || !actor.is_active) {
    return respond(403, { error: 'Superadmin access required' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const action = payload.action;
  if (action === 'list') {
    const { data, error } = await adminClient
      .from('admin_profiles')
      .select('user_id, email, display_name, role, modules, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) return respond(500, { error: error.message });
    return respond(200, { users: data });
  }

  if (action === 'create') {
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    const displayName = typeof payload.displayName === 'string' ? payload.displayName.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || displayName.length > 100
      || !validateModules(payload.modules)) {
      return respond(400, { error: 'Valid email, display name, and assigned modules are required' });
    }

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName },
    });
    if (inviteError) return respond(400, { error: inviteError.message });
    if (!invited.user) return respond(500, { error: 'Supabase did not return the invited user' });

    const { error: profileError } = await adminClient.from('admin_profiles').insert({
      user_id: invited.user.id,
      email,
      display_name: displayName,
      role: 'module_admin',
      modules: payload.modules,
    });
    if (profileError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(invited.user.id);
      return respond(500, {
        error: cleanupError
          ? `${profileError.message}; cleanup failed: ${cleanupError.message}`
          : profileError.message,
      });
    }
    return respond(201, { message: 'Invitation sent' });
  }

  if (action === 'update') {
    const userId = typeof payload.userId === 'string' ? payload.userId : '';
    const displayName = typeof payload.displayName === 'string' ? payload.displayName.trim() : '';
    if (!userId || !displayName || displayName.length > 100 || !validateModules(payload.modules)) {
      return respond(400, { error: 'User ID, display name, and assigned modules are required' });
    }

    const { data: target, error: targetError } = await adminClient
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (targetError) return respond(500, { error: targetError.message });
    if (!target || target.role !== 'module_admin') return respond(404, { error: 'Module admin not found' });

    const isActive = payload.isActive === true;
    const { error } = await adminClient
      .from('admin_profiles')
      .update({ display_name: displayName, modules: payload.modules, is_active: isActive })
      .eq('user_id', userId);
    if (error) return respond(500, { error: error.message });
    return respond(200, { message: 'Admin updated' });
  }

  if (action === 'delete') {
    const userId = typeof payload.userId === 'string' ? payload.userId : '';
    if (!userId || userId === authData.user.id) return respond(400, { error: 'Invalid admin account' });

    const { data: target, error: targetError } = await adminClient
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (targetError) return respond(500, { error: targetError.message });
    if (!target || target.role !== 'module_admin') return respond(404, { error: 'Module admin not found' });

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return respond(500, { error: error.message });
    return respond(200, { message: 'Admin deleted' });
  }

  return respond(400, { error: 'Unknown action' });
});
