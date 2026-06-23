import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usarFuncionIA } from '../funcionesIaAccess.service';

const mockPost = vi.fn();

vi.mock('axios', () => {
  const mockInstance = {
    post: (url: string, data: any) => mockPost(url, data),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
      isAxiosError: vi.fn((err) => err && (err.isAxiosError || err.code)),
    },
  };
});

describe('funcionesIaAccess service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockPost.mockReset();
  });

  it('CU-20 caches IA permission on successful backend check', async () => {
    const mockResponse = {
      permitido: true,
      codigo: 'ACCESO_AUTORIZADO',
      mensaje: 'Acceso concedido',
    };
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await usarFuncionIA('asistente_ia');

    expect(result).toEqual(mockResponse);
    expect(mockPost).toHaveBeenCalledWith('/api/ia/usar-funcion', { funcion: 'asistente_ia' });

    // Check that it was cached
    const cached = localStorage.getItem('homechef_ia_permission_asistente_ia');
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!)).toEqual(mockResponse);
  });

  it('CU-20 falls back to cached permission if offline and cache exists', async () => {
    // Set up mock token and cached permission
    localStorage.setItem('homechef_access_token', 'mock_token');
    const cachedResponse = {
      permitido: true,
      codigo: 'ACCESO_AUTORIZADO',
      mensaje: 'Acceso concedido',
    };
    localStorage.setItem('homechef_ia_permission_asistente_ia', JSON.stringify(cachedResponse));

    // Simulate network error
    const networkError = new Error('Network Error');
    (networkError as any).isAxiosError = true;
    (networkError as any).code = 'ERR_NETWORK';
    mockPost.mockRejectedValueOnce(networkError);

    const result = await usarFuncionIA('asistente_ia');

    // Should return cached permission with the fallback offline message and flag
    expect(result.permitido).toBe(true);
    expect(result.codigo).toBe('ACCESO_AUTORIZADO');
    expect(result.mensaje).toBe('Backend no disponible. Usando último acceso IA validado.');
    expect(result.offlineCachedAccess).toBe(true);
  });

  it('CU-20 throws error if offline and no cache exists', async () => {
    localStorage.setItem('homechef_access_token', 'mock_token');
    // No permission cached

    // Simulate network error
    const networkError = new Error('Network Error');
    (networkError as any).isAxiosError = true;
    (networkError as any).code = 'ERR_NETWORK';
    mockPost.mockRejectedValueOnce(networkError);

    await expect(usarFuncionIA('asistente_ia')).rejects.toThrow('Network Error');
  });
});
