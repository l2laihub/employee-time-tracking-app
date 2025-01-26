import { describe, it, expect, vi } from 'vitest'
import { validateInviteToken } from '../auth'
import { supabase } from '../supabase'

vi.mock('../supabase')

describe('auth utilities', () => {
  describe('validateInviteToken', () => {
    it('rejects expired tokens', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { 
          message: 'Token expired',
          details: 'Token has expired',
          hint: 'Request a new invitation',
          code: '42501',
          name: 'TokenExpiredError'
        },
        count: null,
        status: 400,
        statusText: 'Bad Request'
      })
      
      const result = await validateInviteToken('expired-token')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/expired/i)
    })

    it('validates good tokens', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { organization_id: 'org-123' },
        error: null,
        count: 1,
        status: 200,
        statusText: 'OK'
      })
      
      const result = await validateInviteToken('good-token')
      expect(result.valid).toBe(true)
      expect(result.orgId).toBe('org-123')
    })
  })
})
