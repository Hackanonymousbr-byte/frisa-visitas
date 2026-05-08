import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
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
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STORAGE_VISITADOS = "visitados_v2";
const STORAGE_CLIENTES = "clientes_v1";

const MAPS_LINKS: Record<string, string> = {
  "Angatu Restaurante":
    "https://www.google.com/maps/search/?api=1&query=Angatu+Restaurante+Vitoria+ES",
  "Jamw Cafeteria":
    "https://www.google.com/maps/search/?api=1&query=Jamw+Cafeteria+Vitoria+ES",
  "Tokaki Marmitaria":
    "https://www.google.com/maps/search/?api=1&query=Tokaki+Marmitaria+Vitoria+ES",
  "Restaurante do Urso":
    "https://www.google.com/maps/search/?api=1&query=Restaurante+do+Urso+Vitoria+ES",
};

const CLIENTES_INICIAIS = [
  "Deilza Linfal",
  "Edimilton Nunes",
  "Edson Bonifacio",
  "Jonatas Porto",
  "Marina Maria",
  "Rosiene Alves",
  "Maria do Socorro",
  "Gilda Vieira",
  "Valdeir Ferreira",
  "Schirley Moraes",
  "A R Souza",
  "Alessandra dos Santos",
  "Angatu Restaurante",
  "Bar e Restaurante Taube",
  "Bartelie Gastro Lounge",
  "Bob Grill",
  "Capitão Gastrobar",
  "Center Mobile",
  "Comercial Gouveia",
  "Empório do Mercado",
  "Espeto Capixaba",
  "Esquina 25",
  "Focaccia Forno",
  "Garapa Pastelaria",
  "Hotel Sol e Mar",
  "J de O de Vasconcelos",
  "Jamw Cafeteria",
  "José Roberto",
  "Lauzir Gasparini",
  "MS Padaria",
  "Nosso Kilão",
  "Padaria Delícias e Sabores",
  "Padaria Maria Ortiz",
  "Padaria Sevilha",
  "Padaria Silvestre",
  "Padarita Casa de Pães",
  "Pão Francês Padaria",
  "Reginaldo Araújo",
  "Restaurante Brasileirinho",
  "Restaurante do Urso",
  "Restaurante Lá Tetê",
  "Restaurante Quebra Nozes",
  "Robson Oliveira",
  "Santa Martha",
  "SL Souza",
  "Sociedade Comercial",
  "Saudati Escolas",
  "S V Pizzaria",
  "TF Restaurante",
  "Tokaki Marmitaria",
  "V das G",
  "Wanderson Rodrigues",
];

function ProgressBar({ progress }: { progress: number }) {
  const colors = useColors();
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, { duration: 700 });
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as unknown as number,
  }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <Animated.View
        style={[styles.progressFill, animStyle, { backgroundColor: colors.primary }]}
      />
    </View>
  );
}

function ClienteCard({
  cliente,
  checked,
  onToggle,
  onMaps,
  onRemove,
  index,
}: {
  cliente: string;
  checked: boolean;
  onToggle: () => void;
  onMaps: () => void;
  onRemove: () => void;
  index: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.97, { duration: 120 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    onToggle();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Remover cliente",
      `Deseja remover "${cliente}" da lista?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: onRemove },
      ]
    );
  };

  const initial = cliente.charAt(0).toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(index * 18).duration(300)}>
      <Animated.View style={animStyle}>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={[
            styles.card,
            {
              backgroundColor: checked ? "rgba(34,197,94,0.08)" : colors.card,
              borderColor: checked ? "rgba(34,197,94,0.25)" : colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              { backgroundColor: checked ? colors.primary : colors.secondary },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: checked ? "#fff" : colors.mutedForeground },
              ]}
            >
              {initial}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <Text
              style={[
                styles.clienteName,
                {
                  color: checked ? colors.mutedForeground : colors.foreground,
                  textDecorationLine: checked ? "line-through" : "none",
                },
              ]}
              numberOfLines={1}
            >
              {cliente}
            </Text>
            <Text
              style={[
                styles.clienteStatus,
                { color: checked ? colors.primary : colors.mutedForeground },
              ]}
            >
              {checked ? "Visitado" : "Aguardando visita"}
            </Text>
          </View>

          <Pressable
            onPress={onMaps}
            style={({ pressed }) => [
              styles.mapsBtn,
              {
                backgroundColor: pressed ? colors.secondary : colors.muted,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
          </Pressable>

          {checked && (
            <Feather
              name="check-circle"
              size={18}
              color={colors.primary}
              style={{ marginLeft: 8 }}
            />
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function AddClienteModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (nome: string) => void;
}) {
  const colors = useColors();
  const [nome, setNome] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setNome("");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  const handleAdd = () => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />

            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              Adicionar cliente
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Digite o nome e toque em Adicionar
            </Text>

            <View
              style={[
                styles.modalInput,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.modalInputText, { color: colors.foreground }]}
                placeholder="Nome do cliente..."
                placeholderTextColor={colors.mutedForeground}
                value={nome}
                onChangeText={setNome}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={onClose}
                style={[
                  styles.modalBtn,
                  { backgroundColor: colors.secondary, flex: 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={handleAdd}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: colors.primary,
                    flex: 1,
                    opacity: nome.trim() ? 1 : 0.5,
                  },
                ]}
                disabled={!nome.trim()}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>
                  Adicionar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [clientes, setClientes] = useState<string[]>([]);
  const [visitados, setVisitados] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_CLIENTES),
      AsyncStorage.getItem(STORAGE_VISITADOS),
    ]).then(([cl, vi]) => {
      setClientes(cl ? JSON.parse(cl) : CLIENTES_INICIAIS);
      if (vi) setVisitados(JSON.parse(vi));
    });
  }, []);

  const saveClientes = useCallback((next: string[]) => {
    setClientes(next);
    AsyncStorage.setItem(STORAGE_CLIENTES, JSON.stringify(next));
  }, []);

  const addCliente = useCallback(
    (nome: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const next = [...clientes, nome];
      saveClientes(next);
    },
    [clientes, saveClientes]
  );

  const removeCliente = useCallback(
    (nome: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const nextCl = clientes.filter((c) => c !== nome);
      const nextVi = visitados.filter((c) => c !== nome);
      saveClientes(nextCl);
      setVisitados(nextVi);
      AsyncStorage.setItem(STORAGE_VISITADOS, JSON.stringify(nextVi));
    },
    [clientes, visitados, saveClientes]
  );

  const toggleVisitado = useCallback((cliente: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisitados((prev) => {
      const next = prev.includes(cliente)
        ? prev.filter((c) => c !== cliente)
        : [...prev, cliente];
      AsyncStorage.setItem(STORAGE_VISITADOS, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetVisitas = useCallback(() => {
    Alert.alert(
      "Resetar visitas",
      "Tem certeza? Todas as visitas do dia serão apagadas.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetar",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setVisitados([]);
            AsyncStorage.removeItem(STORAGE_VISITADOS);
          },
        },
      ]
    );
  }, []);

  const openMaps = useCallback((cliente: string) => {
    const url =
      MAPS_LINKS[cliente] ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        cliente + " Vitória ES"
      )}`;
    Linking.openURL(url);
  }, []);

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => c.toLowerCase().includes(busca.toLowerCase())),
    [busca, clientes]
  );

  const visitadosCount = visitados.length;
  const pendentesCount = clientes.length - visitadosCount;
  const progresso =
    clientes.length > 0
      ? Math.round((visitadosCount / clientes.length) * 100)
      : 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 90 },
        ]}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    Visitas
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Controle de rotas
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBadge,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.progressPct, { color: colors.foreground }]}>
                    {progresso}%
                  </Text>
                  <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                    concluído
                  </Text>
                </View>
              </View>

              <ProgressBar progress={progresso} />

              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Feather name="users" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.statNum, { color: colors.foreground }]}>
                    {clientes.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    Total
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: "rgba(34,197,94,0.08)",
                      borderColor: "rgba(34,197,94,0.2)",
                    },
                  ]}
                >
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.statNum, { color: colors.primary }]}>
                    {visitadosCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.primary }]}>
                    Visitados
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: "rgba(234,179,8,0.08)",
                      borderColor: "rgba(234,179,8,0.2)",
                    },
                  ]}
                >
                  <Feather name="clock" size={14} color="#EAB308" />
                  <Text style={[styles.statNum, { color: "#EAB308" }]}>
                    {pendentesCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: "#EAB308" }]}>
                    Pendentes
                  </Text>
                </View>
              </View>

              <View style={styles.searchRow}>
                <View
                  style={[
                    styles.searchBar,
                    { backgroundColor: colors.card, borderColor: colors.border, flex: 1 },
                  ]}
                >
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

                <Pressable
                  onPress={resetVisitas}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      backgroundColor: pressed
                        ? "rgba(239,68,68,0.18)"
                        : "rgba(239,68,68,0.1)",
                      borderColor: "rgba(239,68,68,0.25)",
                      opacity: visitadosCount === 0 ? 0.4 : 1,
                    },
                  ]}
                  disabled={visitadosCount === 0}
                >
                  <Feather name="refresh-ccw" size={16} color="#ef4444" />
                </Pressable>
              </View>

              {clientesFiltrados.length === 0 && busca.length > 0 && (
                <View style={styles.emptySearch}>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    Nenhum cliente encontrado
                  </Text>
                </View>
              )}
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <ClienteCard
            cliente={item}
            checked={visitados.includes(item)}
            onToggle={() => toggleVisitado(item)}
            onMaps={() => openMaps(item)}
            onRemove={() => removeCliente(item)}
            index={index}
          />
        )}
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB — Adicionar cliente */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: pressed ? "#16a34a" : colors.primary,
            bottom: bottomPad + 24,
          },
        ]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <AddClienteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addCliente}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  header: { paddingBottom: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  progressBadge: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 90,
  },
  progressPct: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySearch: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  cardContent: { flex: 1, gap: 3 },
  clienteName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  clienteStatus: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  mapsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
  },
  modalInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  modalInputText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
