import { Linking, Platform } from 'react-native';

import { openStore } from './store-link';

export function openStoreListing() {
  void openStore(Platform.OS, (url) => Linking.openURL(url));
}
