import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export function Icon({
  ios,
  android,
  size = 22,
  color,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  size?: number;
  color: ColorValue;
}) {
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      tintColor={color}
      size={size}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
    />
  );
}
