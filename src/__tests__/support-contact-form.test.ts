/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { SupportContactForm } from '@/components/support/SupportContactForm';

jest.mock('@/components/i18n/language-provider', () => ({
  useLanguage: () => ({ locale: 'en' }),
}));

const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const originalFetch = global.fetch;

function fillValidSupportForm() {
  fireEvent.change(screen.getByLabelText(/First name/), {
    target: { value: 'Oqool' },
  });
  fireEvent.change(screen.getByLabelText(/Last name/), {
    target: { value: 'Support' },
  });
  fireEvent.change(screen.getByLabelText(/Phone/), {
    target: { value: '155 592 0686' },
  });
  fireEvent.change(screen.getByLabelText(/Email/), {
    target: { value: 'support-qa@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/Message or questions/), {
    target: { value: 'Please help with this support question.' },
  });
}

describe('SupportContactForm', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('shows client-side errors without sending an invalid form', () => {
    render(createElement(SupportContactForm));

    expect(screen.getByRole('img', { name: 'Egypt flag' }).textContent).toBe('🇪🇬');
    expect(
      screen.getByRole('button', { name: 'Country code +20 Egypt' }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getByText('First name is required.')).toBeTruthy();
    expect(screen.getByText('Last name is required.')).toBeTruthy();
    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Phone number is required.')).toBeTruthy();
    expect(screen.getByText('Message or questions is required.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('searches worldwide calling codes and updates the grouped prefix and flag', () => {
    render(createElement(SupportContactForm));

    fireEvent.click(
      screen.getByRole('button', { name: 'Country code +20 Egypt' }),
    );

    expect(screen.getAllByRole('option').length).toBeGreaterThan(200);

    const countrySearch = screen.getByRole('combobox', {
      name: 'Search country or code',
    });

    fireEvent.change(countrySearch, { target: { value: 'Egypt' } });
    expect(screen.getByRole('option', { name: 'Egypt (+20)' })).toBeTruthy();

    fireEvent.change(countrySearch, { target: { value: '+20' } });
    expect(screen.getByRole('option', { name: 'Egypt (+20)' })).toBeTruthy();

    fireEvent.change(countrySearch, { target: { value: '20' } });
    expect(screen.getByRole('option', { name: 'Egypt (+20)' })).toBeTruthy();

    fireEvent.change(countrySearch, { target: { value: 'United States' } });
    expect(
      screen.getByRole('option', { name: 'United States (+1)' }).textContent,
    ).toContain('🇺🇸');

    fireEvent.change(countrySearch, {
      target: { value: 'Saudi' },
    });
    fireEvent.click(
      screen.getByRole('option', { name: 'Saudi Arabia (+966)' }),
    );

    expect(
      screen.getByRole('button', {
        name: 'Country code +966 Saudi Arabia',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', { name: 'Saudi Arabia flag' }).textContent,
    ).toBe('🇸🇦');
  });

  it('shows loading and success states after a valid direct submission', async () => {
    let resolveResponse: ((response: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    render(createElement(SupportContactForm));
    fillValidSupportForm();

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
    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      email: 'support-qa@example.com',
      firstName: 'Oqool',
      lastName: 'Support',
      message: 'Please help with this support question.',
      phone: '+201555920686',
    });

    await act(async () => {
      resolveResponse?.(
        {
          json: async () => ({
            emailDelivery: 'sent',
            ok: true,
            reference: 'QA-LOCAL',
          }),
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

  it('truthfully reports when the inquiry is saved but email is pending', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        emailDelivery: 'pending',
        ok: true,
        reference: 'QA-PENDING',
      }),
      ok: true,
    } as Response);

    render(createElement(SupportContactForm));
    fillValidSupportForm();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByText(/email notification is temporarily pending/i),
    ).toBeTruthy();
    expect(screen.getByText(/QA-PENDING/)).toBeTruthy();
  });

  it('links the submission acknowledgment to the privacy policy', () => {
    render(createElement(SupportContactForm));

    expect(
      screen.getByText(/By submitting this form I have read and acknowledged/),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href'),
    ).toBe('/privacy');
  });
});
