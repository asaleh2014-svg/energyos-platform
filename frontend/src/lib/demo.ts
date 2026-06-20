export const DEMO_KEY    = 'energyos_demo_mode'
export const DEMO_TENANT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

export const isDemoMode  = () => localStorage.getItem(DEMO_KEY) === 'true'
export const enterDemo   = () => { localStorage.setItem(DEMO_KEY, 'true');  window.location.href = '/' }
export const exitDemo    = () => { localStorage.removeItem(DEMO_KEY);        window.location.href = '/login' }
