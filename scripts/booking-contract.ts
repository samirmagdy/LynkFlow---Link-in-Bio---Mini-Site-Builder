import { validateBlockPayload } from '../src/utils/blockValidator';

const valid = validateBlockPayload('form', {
  formType: 'booking',
  fields: [
    { id: 'email', label: 'Email', type: 'email', required: true },
    { id: 'date', label: 'Preferred date', type: 'date', required: true },
  ],
  submitButtonText: 'Request a time',
  successMessage: 'Thanks',
});
if (!valid.isValid) throw new Error(`Expected booking form to validate: ${valid.errors.join(', ')}`);

const missingDate = validateBlockPayload('form', {
  formType: 'booking',
  fields: [{ id: 'email', label: 'Email', type: 'email', required: true }],
  submitButtonText: 'Request a time',
  successMessage: 'Thanks',
});
if (missingDate.isValid || !missingDate.errors.some(error => error.includes('preferred date'))) throw new Error('Booking forms must require a preferred date.');

console.log('Booking form contract passed.');
