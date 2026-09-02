const TEXT_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Est égal à (=)' },
  { value: 'not_equals', label: 'Est différent de (≠)' },
  { value: 'contains', label: 'Contient' }
];

const NUMBER_OPERATOR_OPTIONS = [
  { value: 'lt', label: 'Inférieur (<)' },
  { value: 'lte', label: 'Inférieur ou égal (≤)' },
  { value: 'equals', label: 'Égal (=)' },
  { value: 'gte', label: 'Supérieur ou égal (≥)' },
  { value: 'gt', label: 'Supérieur (>)' }
];

const BOOLEAN_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Égal (=)' },
  { value: 'not_equals', label: 'Différent de (≠)' }
];

export const getOperatorOptionsForType = (questionType = 'choice') => {
  if (questionType === 'number') {
    return NUMBER_OPERATOR_OPTIONS;
  }

  if (questionType === 'boolean') {
    return BOOLEAN_OPERATOR_OPTIONS;
  }

  return TEXT_OPERATOR_OPTIONS;
};

export const ensureOperatorForType = (questionType = 'choice', operator = 'equals') => {
  const options = getOperatorOptionsForType(questionType);
  if (options.some(option => option.value === operator)) {
    return operator;
  }

  return options.length > 0 ? options[0].value : 'equals';
};
