import { useTranslation } from 'react-i18next';

export function useUppercase(): (text: string) => string {
  const { i18n } = useTranslation();
  return (text) => text.toLocaleUpperCase(i18n.language);
}

export const NAME_SLOT = '{}';

export function useUppercaseAround(): (template: string, name: string, local: boolean) => string {
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  return (template, name, local) => template.split(NAME_SLOT).map(uppercase).join(nameUppercase(name, local));
}

export function useNameUppercase(): (name: string, local: boolean) => string {
  const { i18n } = useTranslation();
  return (name, local) => (local ? name.toLocaleUpperCase(i18n.language) : name.toUpperCase());
}
