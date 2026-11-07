/**
 * WaysZ forms — frontend only (no backend of our own).
 *
 * Markup contract (every form):
 *   <form data-form="contact" data-messages={JSON.stringify(t.form)} novalidate>
 *     <input id="contact-name" name="name" required aria-describedby="contact-name-error">
 *     <p id="contact-name-error" class="field__error" aria-live="polite"></p>
 *     …
 *     <button type="submit">…</button>
 *     <p data-form-status role="status"></p>
 *   </form>
 *
 * Events dispatched on the <form> (the form-flight motion scene listens to them):
 *   'waysz:form-success'  ·  'waysz:form-error' (detail.reason: 'validation' | 'network')
 */

type FormMessages = {
  required: string; phone: string; email: string; service: string;
  success: string; error: string; sending: string;
};
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const ENDPOINT = (import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined) ?? '';

/**
 * The ONLY place that knows where messages go.
 * TODO(endpoint): the destination is not decided yet (target mailbox: info@waysz.org or another
 * address — to be confirmed). Until PUBLIC_FORM_ENDPOINT is set, sending is simulated.
 * Do not pick a provider without the team's decision.
 */
async function send(formName: string, data: FormData): Promise<void> {
  if (!ENDPOINT) {
    console.info(`[forms] simulated send → "${formName}"`, Object.fromEntries(data));
    await new Promise((resolve) => setTimeout(resolve, 700));
    return;
  }
  data.append('form', formName);
  const res = await fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Form endpoint answered ${res.status}`);
}

function messageFor(field: Field, msgs: FormMessages): string {
  const v = field.validity;
  if (v.valueMissing) return field instanceof HTMLSelectElement ? msgs.service : msgs.required;
  if (field.type === 'email') return msgs.email;
  if (field.type === 'tel') return msgs.phone;
  return msgs.required;
}

function setError(field: Field, text: string) {
  const out = document.getElementById(`${field.id}-error`);
  if (text) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
  if (out) out.textContent = text;
}

export function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-form]').forEach((form) => {
    const msgs = JSON.parse(form.dataset.messages || '{}') as FormMessages;
    const status = form.querySelector<HTMLElement>('[data-form-status]');
    const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
    const fields = () =>
      [...form.elements].filter((el): el is Field => 'validity' in el && (el as Field).willValidate);

    form.noValidate = true;

    // Clear a field's error as soon as it becomes valid
    form.addEventListener('input', (e) => {
      const f = e.target as Field;
      if (f.getAttribute?.('aria-invalid') === 'true' && f.checkValidity()) setError(f, '');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let firstInvalid: Field | null = null;
      for (const f of fields()) {
        if (f.checkValidity()) setError(f, '');
        else { setError(f, messageFor(f, msgs)); firstInvalid ??= f; }
      }
      if (firstInvalid) {
        firstInvalid.focus();
        form.dispatchEvent(new CustomEvent('waysz:form-error', { detail: { reason: 'validation' } }));
        return;
      }

      const label = submit?.textContent ?? '';
      if (submit) { submit.disabled = true; submit.textContent = msgs.sending; }
      try {
        await send(form.dataset.form!, new FormData(form));
        if (status) { status.textContent = msgs.success; status.dataset.state = 'success'; }
        form.reset();
        form.dispatchEvent(new CustomEvent('waysz:form-success'));
      } catch (err) {
        console.error('[forms]', err);
        if (status) { status.textContent = msgs.error; status.dataset.state = 'error'; }
        form.dispatchEvent(new CustomEvent('waysz:form-error', { detail: { reason: 'network' } }));
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = label; }
      }
    });
  });
}
