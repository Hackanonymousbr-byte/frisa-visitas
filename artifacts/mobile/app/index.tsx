import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
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
  ScrollView,
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
const STORAGE_MAPS = "maps_custom_v1";
const STORAGE_HISTORICO = "historico_v1";

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

interface EntradaHistorico {
  data: string;
  visitados: number;
  total: number;
}

function hoje(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  const colors = useColors();
  const width = useSharedValue(0);
  useEffect(() => { width.value = withTiming(progress, { duration: 700 }); }, [progress]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as unknown as number }));
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
      <Animated.View style={[styles.progressFill, animStyle, { backgroundColor: colors.primary }]} />
    </View>
  );
}

// ─── Cliente Card ─────────────────────────────────────────────────────────────
function ClienteCard({
  cliente, checked, mapsCustom, onToggle, onMaps, onRemove, onEditLocation, index,
}: {
  cliente: string; checked: boolean; mapsCustom?: string;
  onToggle: () => void; onMaps: () => void;
  onRemove: () => void; onEditLocation: () => void; index: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSpring(0.97, { duration: 120 }, () => {
      scale.value = withSpring(1, { duration: 200 });
    });
    onToggle();
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(cliente, "O que deseja fazer?", [
      { text: "Editar localização", onPress: onEditLocation },
      { text: "Remover cliente", style: "destructive", onPress: onRemove },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

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
          <View style={[styles.avatar, { backgroundColor: checked ? colors.primary : colors.secondary }]}>
            <Text style={[styles.avatarText, { color: checked ? "#fff" : colors.mutedForeground }]}>
              {cliente.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <Text
              style={[
                styles.clienteName,
                { color: checked ? colors.mutedForeground : colors.foreground, textDecorationLine: checked ? "line-through" : "none" },
              ]}
              numberOfLines={1}
            >
              {cliente}
            </Text>
            <View style={styles.statusRow}>
              <Text style={[styles.clienteStatus, { color: checked ? colors.primary : colors.mutedForeground }]}>
                {checked ? "Visitado" : "Aguardando visita"}
              </Text>
              {mapsCustom && (
                <View style={[styles.customLocBadge, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                  <Feather name="map-pin" size={9} color="#60a5fa" />
                  <Text style={styles.customLocText}>Local editado</Text>
                </View>
              )}
            </View>
          </View>

          <Pressable
            onPress={onMaps}
            style={({ pressed }) => [
              styles.mapsBtn,
              { backgroundColor: pressed ? colors.secondary : colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="map-pin" size={16} color={colors.mutedForeground} />
          </Pressable>

          {checked && <Feather name="check-circle" size={18} color={colors.primary} style={{ marginLeft: 8 }} />}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Add Cliente Modal ────────────────────────────────────────────────────────
function AddClienteModal({ visible, onClose, onAdd }: {
  visible: boolean; onClose: () => void; onAdd: (nome: string) => void;
}) {
  const colors = useColors();
  const [nome, setNome] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setNome(""); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [visible]);

  const handleAdd = () => {
    const t = nome.trim();
    if (!t) return;
    onAdd(t); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Adicionar cliente</Text>
            <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
              Digite o nome e toque em Adicionar
            </Text>
            <View style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
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
              <Pressable onPress={onClose} style={[styles.modalBtn, { backgroundColor: colors.secondary, flex: 1 }]}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1, opacity: nome.trim() ? 1 : 0.5 }]}
                disabled={!nome.trim()}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Adicionar</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Edit Location Modal ──────────────────────────────────────────────────────
function EditLocationModal({ visible, cliente, currentAddress, onClose, onSave }: {
  visible: boolean; cliente: string; currentAddress: string;
  onClose: () => void; onSave: (address: string) => void;
}) {
  const colors = useColors();
  const [address, setAddress] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setAddress(currentAddress);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, currentAddress]);

  const handleSave = () => {
    onSave(address.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: "rgba(255,255,255,0.15)" }]} />

            <View style={styles.editLocHeader}>
              <View style={[styles.editLocIcon, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                <Feather name="map-pin" size={18} color="#60a5fa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 2 }]}>
                  Editar localização
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedForeground, marginBottom: 0 }]}
                  numberOfLines={1}>
                  {cliente}
                </Text>
              </View>
            </View>

            <Text style={[styles.editLocLabel, { color: colors.mutedForeground }]}>
              Endereço ou nome do local
            </Text>
            <View style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 8 }]}>
              <TextInput
                ref={inputRef}
                style={[styles.modalInputText, { color: colors.foreground }]}
                placeholder="Ex: Rua das Flores 123, Vitória ES"
                placeholderTextColor={colors.mutedForeground}
                value={address}
                onChangeText={setAddress}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoCorrect={false}
              />
            </View>
            <Text style={[styles.editLocHint, { color: colors.mutedForeground }]}>
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

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <Pressable onPress={onClose} style={[styles.modalBtn, { backgroundColor: colors.secondary, flex: 1 }]}>
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                style={[styles.modalBtn, { backgroundColor: "#3b82f6", flex: 1 }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Historico Section ────────────────────────────────────────────────────────
function HistoricoSection({ historico }: { historico: EntradaHistorico[] }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  if (historico.length === 0) return null;

  const exibir = expanded ? historico : historico.slice(0, 3);

  return (
    <View style={[styles.historicoCont, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.historicoHeader}
      >
        <View style={styles.historicoTitleRow}>
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
          <Text style={[styles.historicoTitle, { color: colors.foreground }]}>
            Histórico de visitas
          </Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>

      {exibir.map((entry, i) => {
        const pct = entry.total > 0 ? Math.round((entry.visitados / entry.total) * 100) : 0;
        return (
          <View
            key={i}
            style={[styles.historicoRow, { borderTopColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.historicoData, { color: colors.foreground }]}>
                {entry.data}
              </Text>
              <Text style={[styles.historicoDetalhe, { color: colors.mutedForeground }]}>
                {entry.visitados} de {entry.total} clientes visitados
              </Text>
            </View>
            <View style={[styles.historicoPctBadge, {
              backgroundColor: pct >= 80
                ? "rgba(34,197,94,0.12)"
                : pct >= 50
                  ? "rgba(234,179,8,0.12)"
                  : "rgba(239,68,68,0.12)",
            }]}>
              <Text style={[styles.historicoPct, {
                color: pct >= 80 ? colors.primary : pct >= 50 ? "#EAB308" : "#ef4444",
              }]}>
                {pct}%
              </Text>
            </View>
          </View>
        );
      })}

      {historico.length > 3 && (
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.verMaisBtn}>
          <Text style={[styles.verMaisText, { color: colors.mutedForeground }]}>
            {expanded ? "Ver menos" : `Ver mais ${historico.length - 3} dias`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [clientes, setClientes] = useState<string[]>([]);
  const [visitados, setVisitados] = useState<string[]>([]);
  const [mapsCustom, setMapsCustom] = useState<Record<string, string>>({});
  const [historico, setHistorico] = useState<EntradaHistorico[]>([]);
  const [busca, setBusca] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editLocCliente, setEditLocCliente] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        AsyncStorage.getItem(STORAGE_CLIENTES),
        AsyncStorage.getItem(STORAGE_VISITADOS),
        AsyncStorage.getItem(STORAGE_MAPS),
        AsyncStorage.getItem(STORAGE_HISTORICO),
      ]).then(([cl, vi, mp, hi]) => {
        setClientes(cl ? JSON.parse(cl) : CLIENTES_INICIAIS);
        if (vi) setVisitados(JSON.parse(vi));
        if (mp) setMapsCustom(JSON.parse(mp));
        if (hi) setHistorico(JSON.parse(hi));
      });
    }, [])
  );

  const saveClientes = useCallback((next: string[]) => {
    setClientes(next);
    AsyncStorage.setItem(STORAGE_CLIENTES, JSON.stringify(next));
  }, []);

  const addCliente = useCallback((nome: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClientes((prev) => {
      const next = [...prev, nome];
      AsyncStorage.setItem(STORAGE_CLIENTES, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeCliente = useCallback((nome: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setClientes((prev) => {
      const next = prev.filter((c) => c !== nome);
      AsyncStorage.setItem(STORAGE_CLIENTES, JSON.stringify(next));
      return next;
    });
    setVisitados((prev) => {
      const next = prev.filter((c) => c !== nome);
      AsyncStorage.setItem(STORAGE_VISITADOS, JSON.stringify(next));
      return next;
    });
  }, []);

  const saveLocation = useCallback((cliente: string, address: string) => {
    setMapsCustom((prev) => {
      const next = { ...prev };
      if (address) {
        next[cliente] = address;
      } else {
        delete next[cliente];
      }
      AsyncStorage.setItem(STORAGE_MAPS, JSON.stringify(next));
      return next;
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

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
      "Tem certeza? As visitas de hoje serão salvas no histórico e a lista será zerada.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetar",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setVisitados((prev) => {
              if (prev.length > 0) {
                const entrada: EntradaHistorico = {
                  data: hoje(),
                  visitados: prev.length,
                  total: clientes.length,
                };
                setHistorico((hist) => {
                  const next = [entrada, ...hist];
                  AsyncStorage.setItem(STORAGE_HISTORICO, JSON.stringify(next));
                  return next;
                });
              }
              AsyncStorage.removeItem(STORAGE_VISITADOS);
              return [];
            });
          },
        },
      ]
    );
  }, [clientes]);

  const openMaps = useCallback((cliente: string) => {
    const customAddress = mapsCustom[cliente];
    const url = customAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customAddress)}`
      : MAPS_LINKS[cliente] ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente + " Vitória ES")}`;
    Linking.openURL(url);
  }, [mapsCustom]);

  const clientesFiltrados = useMemo(
    () => clientes.filter((c) => c.toLowerCase().includes(busca.toLowerCase())),
    [busca, clientes]
  );

  const visitadosCount = visitados.length;
  const pendentesCount = clientes.length - visitadosCount;
  const progresso = clientes.length > 0
    ? Math.round((visitadosCount / clientes.length) * 100)
    : 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const editLocCliente_ = editLocCliente ?? "";
  const currentAddress = editLocCliente ? (mapsCustom[editLocCliente] ?? "") : "";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: topPad + 8 }]}>
              {/* Title + Progress Badge */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.foreground }]}>Visitas</Text>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Controle de rotas
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/gerenciar")}
                  style={[styles.gearBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Feather name="settings" size={18} color={colors.mutedForeground} />
                </Pressable>
                <View style={[styles.progressBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.progressPct, { color: colors.foreground }]}>{progresso}%</Text>
                  <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>concluído</Text>
                </View>
              </View>

              <ProgressBar progress={progresso} />

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="users" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.statNum, { color: colors.foreground }]}>{clientes.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }]}>
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.statNum, { color: colors.primary }]}>{visitadosCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.primary }]}>Visitados</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "rgba(234,179,8,0.08)", borderColor: "rgba(234,179,8,0.2)" }]}>
                  <Feather name="clock" size={14} color="#EAB308" />
                  <Text style={[styles.statNum, { color: "#EAB308" }]}>{pendentesCount}</Text>
                  <Text style={[styles.statLabel, { color: "#EAB308" }]}>Pendentes</Text>
                </View>
              </View>

              {/* Search + Reset */}
              <View style={styles.searchRow}>
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
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
                      backgroundColor: pressed ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.1)",
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
        ListFooterComponent={
          <View style={{ marginTop: 8 }}>
            <HistoricoSection historico={historico} />
          </View>
        }
        renderItem={({ item, index }) => (
          <ClienteCard
            cliente={item}
            checked={visitados.includes(item)}
            mapsCustom={mapsCustom[item]}
            onToggle={() => toggleVisitado(item)}
            onMaps={() => openMaps(item)}
            onRemove={() => removeCliente(item)}
            onEditLocation={() => setEditLocCliente(item)}
            index={index}
          />
        )}
        keyboardShouldPersistTaps="handled"
      />

      {/* FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAddModalVisible(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: pressed ? "#16a34a" : colors.primary, bottom: bottomPad + 24 },
        ]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <AddClienteModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={addCliente}
      />

      <EditLocationModal
        visible={editLocCliente !== null}
        cliente={editLocCliente_}
        currentAddress={currentAddress}
        onClose={() => setEditLocCliente(null)}
        onSave={(address) => saveLocation(editLocCliente_, address)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  header: { paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  gearBtn: {
    width: 44, height: 44, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  progressBadge: {
    borderRadius: 16, borderWidth: 1, paddingHorizontal: 16,
    paddingVertical: 10, alignItems: "center", minWidth: 90,
  },
  progressPct: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  progressLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", borderRadius: 999 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptySearch: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  card: {
    flexDirection: "row", alignItems: "center", borderRadius: 18,
    borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 10, gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardContent: { flex: 1, gap: 3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  clienteName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clienteStatus: { fontSize: 12, fontFamily: "Inter_400Regular" },
  customLocBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2,
  },
  customLocText: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#60a5fa" },
  mapsBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fab: {
    position: "absolute", right: 20, width: 58, height: 58, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#22C55E", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 99, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  modalInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 16 },
  modalInputText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  modalBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  editLocHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  editLocIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  editLocLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  editLocHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 8 },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", borderWidth: 1, borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  clearBtnText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historicoCont: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  historicoHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  historicoTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  historicoTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  historicoRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  historicoData: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historicoDetalhe: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  historicoPctBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  historicoPct: { fontSize: 15, fontFamily: "Inter_700Bold" },
  verMaisBtn: { paddingVertical: 12, alignItems: "center" },
  verMaisText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
