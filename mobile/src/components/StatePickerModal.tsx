import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { colors } from "../theme";
import { US_STATE_AND_DC_CODES, getStateName } from "../utils/states";

interface Props {
  visible: boolean;
  onSelect: (stateCode: string) => void;
  onClose: () => void;
}

export default function StatePickerModal({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = React.useState("");
  const { height } = useWindowDimensions();

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return US_STATE_AND_DC_CODES;
    return US_STATE_AND_DC_CODES.filter((code) => {
      const name = getStateName(code).toLowerCase();
      return code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [query]);

  React.useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: height * 0.85 }]}>
          <Text style={styles.sheetTitle}>Choose your state</Text>
          <TextInput
            style={styles.search}
            placeholder="Search state"
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.rowName}>{getStateName(item)}</Text>
                <Text style={styles.rowCode}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
          />
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowName: {
    color: colors.text,
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  rowCode: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: "600",
  },
  empty: {
    color: colors.textDim,
    textAlign: "center",
    paddingVertical: 24,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
});
