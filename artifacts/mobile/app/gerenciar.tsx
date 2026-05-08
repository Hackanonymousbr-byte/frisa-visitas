import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STORAGE_CLIENTES = "clientes_v1";
const STORAGE_MAPS = "maps_custom_v1";
const STORAGE_VISITADOS = "visitados_v2";

const CLIENTES_INICIAIS = [
  "Deilza Linfal", "Edimilton Nunes", "Edson Bonifacio", "Jonatas Porto",
  "Marina Maria", "Rosiene Alves", "Maria do Socorro", "Gilda Vieira",
  "Valdeir Ferreira", "Schirley Moraes", "A R Souza", "Alessandra dos Santos",
  "Angatu Restaurante", "Bar e Restaurante Taube", "Bartelie Gastro Lounge",
  "Bob Grill", "Capitão Gastrobar", "Center Mobile", "Comercial Gouveia",
  "Empório do Mercado", "Espeto Capixaba", "Esquina 25", "Focaccia Forno",
  "Garapa Pastelaria", "Hotel Sol e Mar", "J de O de Vasconcelos",
  "Jamw Cafeteria", "José Roberto", "Lauzir Gasparini", "MS Padaria",
  "Nosso Kilão", "Padaria Delícias e Sabores", "Padaria Maria Ortiz",
  "Padaria Sevilha", "Padaria Silvestre", "Padarita Casa de Pães",
  "Pão Francês Padaria", "Reginaldo Araújo", "Restaurante Brasileirinho",
  "Restaurante do Urso", "Restaurante Lá Tetê", "Restaurante Quebra Nozes",
  "Robson Oliveira", "Santa Martha", "SL Souza", "Sociedade Comercial",
  "Saudati Escolas", "S V Pizzaria", "TF Restaurante", "Tokaki Marmitaria",
  "V das G", "Wanderson Rodrigues",
];

// ─── Text Input Modal (Add / Rename) ─────────────────────────────────────────
function TextModal({
  visible, title, subtitle, placeholder, initialValue, confirmLabel, onClose, onConfirm,
}: {
  visible: boolean; title: string; subtitle: string; placeholder: string;
  initialValue?: string; confirmLabel: string;
  onClose: () => void; onConfirm: (value: string) => void;
}) {
  const colors = useColors();
  const [value, setValue] = useState(initialValue ?? "");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue ?? "");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, initialValue]);

  const handleConfirm = () => {
    const t = value.trim();
    if (!t) return;
    onConfirm(t);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <View style={[styles.handle, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
            <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                style={[styles.inputText, { color: colors.foreground }]}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={value}
                onChangeText={setValue}
                onSubmitEditing={handleConfirm}
                returnKeyType="done"
                autoCorrect={false}
              />
            </View>
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={[styles.btn, { backgroundColor: colors.secondary, flex: 1 }]}>
                <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={[styles.btn, { backgroundColor: colors.primary, flex: 1, opacity: value.trim() ? 1 : 0.5 }]}
                disabled={!value.trim()}
              >
                <Text style={[styles.btnText, { color: "#fff" }]}>{confirmLabel}</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Location Modal ───────────────────────────────────────────────────────────
function LocationModal({
  visible, cliente, currentAddress, onClose, onSave,
}: {
  visible: boolean; cliente: string; currentAddress: string;
  onClose: () => void; onSave: (address: string) => void;
}) {
  const colors = useColors();
  const [address, setAddress] = useState(currentAddress);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setAddress(currentAddress);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, currentAddress]);

  const handleSave = () => { onSave(address.trim()); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {}}
          >
            <View style={[styles.handle, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
            <View style={styles.locHeader}>
              <View style={[styles.locIcon, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                <Feather name="map-pin" size={18} color="#60a5fa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 2 }]}>
                  Editar localização
                </Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground, marginBottom: 0 }]} numberOfLines={1}>
                  {cliente}
                </Text>
              </View>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Endereço ou nome do local
            </Text>
            <View style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 8 }]}>
              <TextInput
                ref={inputRef}
                style={[styles.inputText, { color: colors.foreground }]}
                placeholder="Ex: Rua das Flores 123, Vitória ES"
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={setAddress}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoCorrect={false}
              />
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              O Maps vai buscar por esse endereço automaticamente.
            </Text>
            {address.trim().length > 0 && (
              <Pressable
                onPress={() => setAddress("")}
                style={[styles.clearBtn, { borderColor: colors.border }]}
              >
                <Feather name="x" size={12} color={colors.mutedForeground} />
                <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>
                  Usar localização padrão
                </Text>
              </Pressable>
            )}
            <View style={[styles.actions, { marginTop: 16 }]}>
              <Pressable onPress={onClose} style={[styles.btn, { backgroundColor: colors.secondary, flex: 1 }]}>
                <Text style={[styles.btnText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={[styles.btn, { backgroundColor: "#3b82f6", flex: 1 }]}>
                <Text style={[styles.btnText, { color: "#fff" }]}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Cliente Row ──────────────────────────────────────────────────────────────
function ClienteRow({
  nome, mapsCustom, index, onRename, onEditLocation, onRemove,
}: {
  nome: string; mapsCustom?: string; index: number;
  onRename: () => void; onEditLocation: () => void; onRemove: () => void;
}) {
  const colors = useColors();

  return (
    <Animated.View entering={FadeInDown.delay(index * 15).duration(280)}>
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.rowAvatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.rowAvatarText, { color: colors.mutedForeground }]}>
            {nome.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.rowContent}>
          <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
            {nome}
          </Text>
          {mapsCustom ? (
            <View style={styles.locBadgeRow}>
              <Feather name="map-pin" size={9} color="#60a5fa" />
              <Text style={styles.locBadgeText}>{mapsCustom}</Text>
            </View>
          ) : (
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              Localização padrão
            </Text>
          )}
        </View>

        <View style={styles.rowActions}>
          <Pressable
            onPress={onRename}
            style={[styles.actionBtn, { backgroundColor: colors.muted }]}
            hitSlop={6}
          >
            <Feather name="edit-2" size={14} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={onEditLocation}
            style={[styles.actionBtn, { backgroundColor: "rgba(59,130,246,0.12)" }]}
            hitSlop={6}
          >
            <Feather name="map-pin" size={14} color="#60a5fa" />
          </Pressable>
          <Pressable
            onPress={onRemove}
            style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.1)" }]}
            hitSlop={6}
          >
            <Feather name="trash-2" size={14} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GerenciarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [clientes, setClientes] = useState<string[]>([]);
  const [mapsCustom, setMapsCustom] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");

  const [addModal, setAddModal] = useState(false);
  const [renameCliente, setRenameCliente] = useState<string | null>(null);
  const [locCliente, setLocCliente] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_CLIENTES),
      AsyncStorage.getItem(STORAGE_MAPS),
    ]).then(([cl, mp]) => {
      setClientes(cl ? JSON.parse(cl) : CLIENTES_INICIAIS);
      if (mp) setMapsCustom(JSON.parse(mp));
    });
  }, []);

  const persist = useCallback((next: string[]) => {
    setClientes(next);
    AsyncStorage.setItem(STORAGE_CLIENTES, JSON.stringify(next));
  }, []);

  const addCliente = useCallback((nome: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    persist([...clientes, nome]);
  }, [clientes, persist]);

  const renameClienteFn = useCallback((antigo: string, novo: string) => {
    if (!novo || antigo === novo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = clientes.map((c) => (c === antigo ? novo : c));
    persist(next);
    // move maps key if exists
    if (mapsCustom[antigo]) {
      const m = { ...mapsCustom, [novo]: mapsCustom[antigo] };
      delete m[antigo];
      setMapsCustom(m);
      AsyncStorage.setItem(STORAGE_MAPS, JSON.stringify(m));
    }
    // move visitados key
    AsyncStorage.getItem(STORAGE_VISITADOS).then((v) => {
      if (!v) return;
      const arr: string[] = JSON.parse(v);
      const idx = arr.indexOf(antigo);
      if (idx !== -1) {
        arr[idx] = novo;
        AsyncStorage.setItem(STORAGE_VISITADOS, JSON.stringify(arr));
      }
    });
  }, [clientes, mapsCustom, persist]);

  const removeCliente = useCallback((nome: string) => {
    const doRemove = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      persist(clientes.filter((c) => c !== nome));
      AsyncStorage.getItem(STORAGE_VISITADOS).then((v) => {
        if (!v) return;
        const arr: string[] = JSON.parse(v).filter((c: string) => c !== nome);
        AsyncStorage.setItem(STORAGE_VISITADOS, JSON.stringify(arr));
      });
    };

    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm(`Deseja remover "${nome}"?`)) doRemove();
    } else {
      Alert.alert("Remover cliente", `Deseja remover "${nome}"?`, [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: doRemove },
      ]);
    }
  }, [clientes, persist]);

  const saveLocation = useCallback((cliente: string, address: string) => {
    const next = { ...mapsCustom };
    if (address) { next[cliente] = address; } else { delete next[cliente]; }
    setMapsCustom(next);
    AsyncStorage.setItem(STORAGE_MAPS, JSON.stringify(next));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [mapsCustom]);

  const filtrados = useMemo(
    () => clientes.filter((c) => c.toLowerCase().includes(busca.toLowerCase())),
    [busca, clientes]
  );

  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Gerenciar clientes
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {clientes.length} clientes cadastrados
          </Text>
        </View>
        <Pressable
          onPress={() => setAddModal(true)}
          style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Buscar cliente..."
          placeholderTextColor={colors.mutedForeground}
          value={busca}
          onChangeText={setBusca}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
        renderItem={({ item, index }) => (
          <ClienteRow
            nome={item}
            mapsCustom={mapsCustom[item]}
            index={index}
            onRename={() => setRenameCliente(item)}
            onEditLocation={() => setLocCliente(item)}
            onRemove={() => removeCliente(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Add modal */}
      <TextModal
        visible={addModal}
        title="Adicionar cliente"
        subtitle="Digite o nome completo do cliente"
        placeholder="Nome do cliente..."
        confirmLabel="Adicionar"
        onClose={() => setAddModal(false)}
        onConfirm={addCliente}
      />

      {/* Rename modal */}
      <TextModal
        visible={renameCliente !== null}
        title="Editar nome"
        subtitle="Altere o nome do cliente"
        placeholder="Novo nome..."
        initialValue={renameCliente ?? ""}
        confirmLabel="Salvar"
        onClose={() => setRenameCliente(null)}
        onConfirm={(novo) => {
          if (renameCliente) renameClienteFn(renameCliente, novo);
        }}
      />

      {/* Location modal */}
      <LocationModal
        visible={locCliente !== null}
        cliente={locCliente ?? ""}
        currentAddress={locCliente ? (mapsCustom[locCliente] ?? "") : ""}
        onClose={() => setLocCliente(null)}
        onSave={(addr) => { if (locCliente) saveLocation(locCliente, addr); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  addHeaderBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1,
    marginHorizontal: 16, marginTop: 14, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8,
  },
  rowAvatar: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  rowAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rowContent: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  locBadgeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  locBadgeText: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#60a5fa", flex: 1 },
  rowActions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, padding: 24, paddingBottom: 36,
  },
  handle: { width: 40, height: 4, borderRadius: 99, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modalSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  input: {
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16,
  },
  inputText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  locHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  locIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  clearBtnText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
