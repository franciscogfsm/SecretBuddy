import { FontAwesome } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

import { colors, typography } from "../theme";
import { COUNTRIES } from "../utils/countries";

const getFlagEmoji = (country: string): string => {
  const flags: Record<string, string> = {
    "United States": "🇺🇸",
    "United Kingdom": "🇬🇧",
    Canada: "🇨🇦",
    Australia: "🇦🇺",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Italy: "🇮🇹",
    Spain: "🇪🇸",
    Portugal: "🇵🇹",
    Brazil: "🇧🇷",
    Mexico: "🇲🇽",
    Japan: "🇯🇵",
    China: "🇨🇳",
    India: "🇮🇳",
    Russia: "🇷🇺",
    "South Korea": "🇰🇷",
    Netherlands: "🇳🇱",
    Belgium: "🇧🇪",
    Switzerland: "🇨🇭",
    Austria: "🇦🇹",
    Sweden: "🇸🇪",
    Norway: "🇳🇴",
    Denmark: "🇩🇰",
    Finland: "🇫🇮",
    Poland: "🇵🇱",
    Czechia: "🇨🇿",
    Hungary: "🇭🇺",
    Greece: "🇬🇷",
    Turkey: "🇹🇷",
    Egypt: "🇪🇬",
    "South Africa": "🇿🇦",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    Colombia: "🇨🇴",
    Peru: "🇵🇪",
    Venezuela: "🇻🇪",
    Uruguay: "🇺🇾",
    Paraguay: "🇵🇾",
    Ecuador: "🇪🇨",
    Bolivia: "🇧🇴",
    Cuba: "🇨🇺",
    "Dominican Republic": "🇩🇴",
    "Puerto Rico": "🇵🇷",
    Jamaica: "🇯🇲",
    Haiti: "🇭🇹",
    "Trinidad and Tobago": "🇹🇹",
    Barbados: "🇧🇧",
    Bahamas: "🇧🇸",
    Belize: "🇧🇿",
    Guatemala: "🇬🇹",
    "El Salvador": "🇸🇻",
    Honduras: "🇭🇳",
    Nicaragua: "🇳🇮",
    "Costa Rica": "🇨🇷",
    Panama: "🇵🇦",
    Philippines: "🇵🇭",
    Indonesia: "🇮🇩",
    Thailand: "🇹🇭",
    Vietnam: "🇻🇳",
    Malaysia: "🇲🇾",
    Singapore: "🇸🇬",
    "New Zealand": "🇳🇿",
    Ireland: "🇮🇪",
    Israel: "🇮🇱",
    "Saudi Arabia": "🇸🇦",
    "United Arab Emirates": "🇦🇪",
    Qatar: "🇶🇦",
    Kuwait: "🇰🇼",
    Jordan: "🇯🇴",
    Lebanon: "🇱🇧",
    Syria: "🇸🇾",
    Iraq: "🇮🇶",
    Iran: "🇮🇷",
    Pakistan: "🇵🇰",
    Bangladesh: "🇧🇩",
    "Sri Lanka": "🇱🇰",
    Nepal: "🇳🇵",
    Bhutan: "🇧🇹",
    Maldives: "🇲🇻",
    Afghanistan: "🇦🇫",
    Kazakhstan: "🇰🇿",
    Uzbekistan: "🇺🇿",
    Turkmenistan: "🇹🇲",
    Tajikistan: "🇹🇯",
    Kyrgyzstan: "🇰🇬",
    Mongolia: "🇲🇳",
    "North Korea": "🇰🇵",
    Taiwan: "🇹🇼",
    "Hong Kong": "🇭🇰",
    Macau: "🇲🇴",
    Cambodia: "🇰🇭",
    Laos: "🇱🇦",
    Myanmar: "🇲🇲",
    Brunei: "🇧🇳",
    "Timor-Leste": "🇹🇱",
    "Papua New Guinea": "🇵🇬",
    Fiji: "🇫🇯",
    Samoa: "🇼🇸",
    Tonga: "🇹🇴",
    Vanuatu: "🇻🇺",
    "Solomon Islands": "🇸🇧",
    Kiribati: "🇰🇮",
    Tuvalu: "🇹🇻",
    Nauru: "🇳🇷",
    "Marshall Islands": "🇲🇭",
    Micronesia: "🇫🇲",
    Palau: "🇵🇼",
    Guam: "🇬🇺",
    "Northern Mariana Islands": "🇲🇵",
    "American Samoa": "🇦🇸",
    "Cook Islands": "🇨🇰",
    "French Polynesia": "🇵🇫",
    "New Caledonia": "🇳🇨",
    "Wallis and Futuna": "🇼🇫",
    "Pitcairn Islands": "🇵🇳",
    "Norfolk Island": "🇳🇫",
    "Christmas Island": "🇨🇽",
    "Cocos (Keeling) Islands": "🇨🇨",
    "Heard Island and McDonald Islands": "🇭🇲",
    Antarctica: "🇦🇶",
    "Bouvet Island": "🇧🇻",
    "South Georgia and the South Sandwich Islands": "🇬🇸",
    "Falkland Islands": "🇫🇰",
    "South Georgia": "🇬🇸",
    "Ascension Island": "🇦🇨",
    "Tristan da Cunha": "🇹🇦",
    "Saint Helena": "🇸🇭",
    "Diego Garcia": "🇮🇴",
    "British Indian Ocean Territory": "🇮🇴",
    "French Southern Territories": "🇹🇫",
    "Kerguelen Islands": "🇹🇫",
    "Crozet Islands": "🇹🇫",
    "Amsterdam Island": "🇹🇫",
    "Saint-Paul Island": "🇹🇫",
    "Clipperton Island": "🇨🇵",
    Mayotte: "🇾🇹",
    Réunion: "🇷🇪",
    Mauritius: "🇲🇺",
    Seychelles: "🇸🇨",
    Comoros: "🇰🇲",
    Madagascar: "🇲🇬",
    Malawi: "🇲🇼",
    Zambia: "🇿🇲",
    Zimbabwe: "🇿🇼",
    Mozambique: "🇲🇿",
    Swaziland: "🇸🇿",
    Lesotho: "🇱🇸",
    Botswana: "🇧🇼",
    Namibia: "🇳🇦",
    Angola: "🇦🇴",
    Congo: "🇨🇬",
    "Democratic Republic of the Congo": "🇨🇩",
    "Central African Republic": "🇨🇫",
    Chad: "🇹🇩",
    Sudan: "🇸🇩",
    "South Sudan": "🇸🇸",
    Eritrea: "🇪🇷",
    Djibouti: "🇩🇯",
    Somalia: "🇸🇴",
    Ethiopia: "🇪🇹",
    Kenya: "🇰🇪",
    Tanzania: "🇹🇿",
    Uganda: "🇺🇬",
    Rwanda: "🇷🇼",
    Burundi: "🇧🇮",
    Liberia: "🇱🇷",
    "Sierra Leone": "🇸🇱",
    Guinea: "🇬🇳",
    "Guinea-Bissau": "🇬🇼",
    Gambia: "🇬🇲",
    Senegal: "🇸🇳",
    Mali: "🇲🇱",
    "Burkina Faso": "🇧🇫",
    Niger: "🇳🇪",
    Chad: "🇹🇩",
    Nigeria: "🇳🇬",
    Benin: "🇧🇯",
    Togo: "🇹🇬",
    Ghana: "🇬🇭",
    "Cote d'Ivoire": "🇨🇮",
    Libya: "🇱🇾",
    Tunisia: "🇹🇳",
    Algeria: "🇩🇿",
    Morocco: "🇲🇦",
    "Western Sahara": "🇪🇭",
    Mauritania: "🇲🇷",
    "Cape Verde": "🇨🇻",
    Albania: "🇦🇱",
    Andorra: "🇦🇩",
    Armenia: "🇦🇲",
    Austria: "🇦🇹",
    Azerbaijan: "🇦🇿",
    Belarus: "🇧🇾",
    Belgium: "🇧🇪",
    "Bosnia and Herzegovina": "🇧🇦",
    Bulgaria: "🇧🇬",
    Croatia: "🇭🇷",
    Cyprus: "🇨🇾",
    "Czech Republic": "🇨🇿",
    Denmark: "🇩🇰",
    Estonia: "🇪🇪",
    "Faroe Islands": "🇫🇴",
    Finland: "🇫🇮",
    France: "🇫🇷",
    Georgia: "🇬🇪",
    Germany: "🇩🇪",
    Gibraltar: "🇬🇮",
    Greece: "🇬🇷",
    Greenland: "🇬🇱",
    Guernsey: "🇬🇬",
    Hungary: "🇭🇺",
    Iceland: "🇮🇸",
    Ireland: "🇮🇪",
    "Isle of Man": "🇮🇲",
    Italy: "🇮🇹",
    Jersey: "🇯🇪",
    Kosovo: "🇽🇰",
    Latvia: "🇱🇻",
    Liechtenstein: "🇱🇮",
    Lithuania: "🇱🇹",
    Luxembourg: "🇱🇺",
    Macedonia: "🇲🇰",
    Malta: "🇲🇹",
    Moldova: "🇲🇩",
    Monaco: "🇲🇨",
    Montenegro: "🇲🇪",
    Netherlands: "🇳🇱",
    Norway: "🇳🇴",
    Poland: "🇵🇱",
    Portugal: "🇵🇹",
    Romania: "🇷🇴",
    Russia: "🇷🇺",
    "San Marino": "🇸🇲",
    Serbia: "🇷🇸",
    Slovakia: "🇸🇰",
    Slovenia: "🇸🇮",
    Spain: "🇪🇸",
    "Svalbard and Jan Mayen": "🇸🇯",
    Sweden: "🇸🇪",
    Switzerland: "🇨🇭",
    Ukraine: "🇺🇦",
    "United Kingdom": "🇬🇧",
    "Vatican City": "🇻🇦",
  };
  return flags[country] || "🏳️";
};

type CountryDropdownProps = {
  label: string;
  value: string;
  onSelect: (country: string) => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export const CountryDropdown = ({
  label,
  value,
  onSelect,
  placeholder = "Select a country",
  containerStyle,
}: CountryDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return COUNTRIES;
    }
    return COUNTRIES.filter((item) => item.toLowerCase().includes(query));
  }, [search]);

  const handleOpen = () => {
    setSearch("");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSelect = (country: string) => {
    onSelect(country);
    setOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selector, open && styles.selectorActive]}
        onPress={handleOpen}
        activeOpacity={0.85}
      >
        <Text
          style={[styles.selectorText, !value && styles.selectorPlaceholder]}
          numberOfLines={1}
        >
          {value ? `${getFlagEmoji(value)} ${value}` : placeholder}
        </Text>
        <FontAwesome
          name="chevron-down"
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose your country</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <FontAwesome
                  name="close"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search countries"
              placeholderTextColor="rgba(255,255,255,0.4)"
              cursorColor={colors.accentPink}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {getFlagEmoji(item)} {item}
                    </Text>
                    {isSelected ? (
                      <FontAwesome
                        name="check"
                        size={16}
                        color={colors.accentTeal}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  No countries found. Try another search.
                </Text>
              }
              style={styles.list}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  selector: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(11, 5, 32, 0.72)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectorActive: {
    borderColor: colors.accentPurple,
    backgroundColor: "rgba(156, 107, 255, 0.22)",
    shadowColor: colors.accentPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 3,
  },
  selectorText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  selectorPlaceholder: {
    color: "rgba(255,255,255,0.45)",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(6, 0, 18, 0.76)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    borderRadius: 24,
    backgroundColor: "rgba(11, 5, 32, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
    maxHeight: "80%",
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 6,
  },
  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(18, 0, 47, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    ...typography.body,
    letterSpacing: 0.2,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 10,
  },
  optionRow: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(26, 12, 56, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionRowSelected: {
    borderColor: colors.accentTeal,
    backgroundColor: "rgba(0, 170, 170, 0.22)",
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  optionLabelSelected: {
    color: colors.accentTeal,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
});
