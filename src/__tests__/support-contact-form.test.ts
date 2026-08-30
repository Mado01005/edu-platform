/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { SupportContactForm } from '@/components/support/SupportContactForm';

jest.mock('@/components/i18n/language-provider', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const originalFetch = global.fetch;

describe('SupportContactForm', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('shows client-side errors without sending an invalid form', () => {
    render(createElement(SupportContactForm));

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getAllByText('Enter at least 2 characters.')).toHaveLength(2);
    expect(
      screen.getByText('Enter a valid phone number with its country code.'),
    ).toBeTruthy();
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(
      screen.getByText('Tell us how we can help in at least 10 characters.'),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows loading and success states after a valid direct submission', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    render(createElement(SupportContactForm));
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Oqool' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Support' },
    });
    fireEvent.change(screen.getByLabelText(/Phone number/), {
      target: { value: '+201555920686' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'support-qa@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Message or questions/), {
      target: { value: 'Please help with this support question.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      (screen.getByRole('button', {
        name: 'Sending securely…',
      }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/support/inquiries',
      expect.objectContaining({ method: 'POST' }),
    );

    await act(async () => {
      resolveResponse?.(
        {
          json: async () => ({ ok: true, reference: 'QA-LOCAL' }),
          ok: true,
        } as Response,
      );
    });

    expect(
      await screen.findByRole('heading', { name: 'Message received' }),
    ).toBeTruthy();
    expect(screen.getByText(/QA-LOCAL/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Send another message' }),
    ).toBeTruthy();
  });
});
