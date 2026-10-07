import { useTranslation } from 'react-i18next';

export function useUppercase(): (text: string) => string {
  const { i18n } = useTranslation();
  return (text) => text.toLocaleUpperCase(i18n.language);
}

export function useNameUppercase(): (name: string, local: boolean) => string {
  const { i18n } = useTranslation();
  return (name, local) => (local ? name.toLocaleUpperCase(i18n.language) : name.toUpperCase());
}
