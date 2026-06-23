import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VisionArtificialPage from '../VisionArtificialPage';
import { describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe('VisionArtificialPage informative mode', () => {
  it('CU-21 renders the informative text telling users the feature is mobile-only', () => {
    render(<VisionArtificialPage />);

    expect(screen.getByText('Visión artificial disponible solo en móvil')).toBeInTheDocument();
    expect(screen.getByText(/Para analizar ingredientes con la cámara/)).toBeInTheDocument();
    expect(screen.getByText(/En la versión web puedes seguir usando/)).toBeInTheDocument();
    expect(screen.getByText('Disponible en la app móvil')).toBeInTheDocument();

    // Verify buttons exist
    expect(screen.getByText('Volver al Asistente IA')).toBeInTheDocument();
    expect(screen.getByText('Ir a Asistente IA textual')).toBeInTheDocument();
    expect(screen.getByText('Ir a Demanda y precios')).toBeInTheDocument();

    // Verify upload elements DO NOT exist
    expect(screen.queryByText('Seleccionar imagen de despensa')).not.toBeInTheDocument();
    expect(screen.queryByText('Analizar ingredientes')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /ej. papa/i })).not.toBeInTheDocument();
  });

  it('navigates correctly when clicking buttons', async () => {
    render(<VisionArtificialPage />);

    const backButton = screen.getByText('Volver al Asistente IA');
    await userEvent.click(backButton);
    expect(navigateMock).toHaveBeenCalledWith('/chef/ai/assistant');

    const assistantButton = screen.getByText('Ir a Asistente IA textual');
    await userEvent.click(assistantButton);
    expect(navigateMock).toHaveBeenCalledWith('/chef/ai/assistant');

    const pricingButton = screen.getByText('Ir a Demanda y precios');
    await userEvent.click(pricingButton);
    expect(navigateMock).toHaveBeenCalledWith('/chef/ai/pricing');
  });
});
