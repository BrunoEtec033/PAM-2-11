import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';

// ===== VALORES DE REFERÊNCIA (mexa aqui durante os testes) =====
const LIMITE_ENTRAR_CENTRO = 0.04; // em g (~2,3 graus): para ENTRAR no centro
const LIMITE_SAIR_CENTRO = 0.07;   // em g (~4,0 graus): para SAIR do centro
const FATOR_FILTRO = 0.2;          // 0 a 1: menor = mais suave, porém mais lento
const INVERTER = false;            // troque para true se o lado ficar trocado
const INTERVALO_MS = 100;          // tempo entre leituras do sensor

// ===== VISUAL =====
const LARGURA_TRILHA = 300;
const TAMANHO_BOLA = 40;
const ANGULO_MAXIMO = 30; // graus que levam a bolinha até a ponta da trilha

// Decisão lógica com histerese (dois limites diferentes)
function decidirEstado(valor, estadoAtual) {
  if (estadoAtual === 'centro') {
    if (valor > LIMITE_SAIR_CENTRO) return 'direita';
    if (valor < -LIMITE_SAIR_CENTRO) return 'esquerda';
    return 'centro';
  }
  if (Math.abs(valor) < LIMITE_ENTRAR_CENTRO) return 'centro';
  return valor > 0 ? 'direita' : 'esquerda';
}

// Ângulo estimado a partir de X (em g): sen(ângulo) = x
function calcularAngulo(x) {
  const limitado = Math.max(-1, Math.min(1, x));
  return (Math.asin(limitado) * 180) / Math.PI;
}

const MENSAGENS = {
  esquerda: 'Inclinado para a esquerda',
  centro: 'Nivelado (posição central)',
  direita: 'Inclinado para a direita',
};
const CORES = { esquerda: '#e67e22', centro: '#27ae60', direita: '#2980b9' };

export default function App() {
  const [bruto, setBruto] = useState({ x: 0, y: 0, z: 0 });
  const [filtrado, setFiltrado] = useState(0);
  const [estado, setEstado] = useState('centro');

  const filtradoRef = useRef(0);
  const estadoRef = useRef('centro');

  useEffect(() => {
    Accelerometer.setUpdateInterval(INTERVALO_MS);
    const assinatura = Accelerometer.addListener(({ x, y, z }) => {
      const xUsado = INVERTER ? -x : x;

      // Tratamento: filtro passa-baixa (suaviza ruído)
      filtradoRef.current =
        filtradoRef.current * (1 - FATOR_FILTRO) + xUsado * FATOR_FILTRO;

      // Decisão lógica
      estadoRef.current = decidirEstado(filtradoRef.current, estadoRef.current);

      setBruto({ x, y, z });
      setFiltrado(filtradoRef.current);
      setEstado(estadoRef.current);
    });
    return () => assinatura.remove();
  }, []);

  const angulo = calcularAngulo(filtrado);
  const proporcao =
    (Math.max(-ANGULO_MAXIMO, Math.min(ANGULO_MAXIMO, angulo)) + ANGULO_MAXIMO) /
    (2 * ANGULO_MAXIMO);
  const posicaoBola = proporcao * (LARGURA_TRILHA - TAMANHO_BOLA);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Nível Digital</Text>

      <Text style={[styles.mensagem, { color: CORES[estado] }]}>
        {MENSAGENS[estado]}
      </Text>

      <View style={styles.trilha}>
        <View style={styles.marcaCentral} />
        <View
          style={[
            styles.bola,
            { left: posicaoBola, backgroundColor: CORES[estado] },
          ]}
        />
      </View>

      <Text style={styles.angulo}>{angulo.toFixed(1)}°</Text>

      <View style={styles.dados}>
        <Text style={styles.linha}>X bruto: {bruto.x.toFixed(3)} g</Text>
        <Text style={styles.linha}>Y bruto: {bruto.y.toFixed(3)} g</Text>
        <Text style={styles.linha}>Z bruto: {bruto.z.toFixed(3)} g</Text>
        <Text style={styles.linha}>X filtrado: {filtrado.toFixed(3)} g</Text>
        <Text style={styles.linha}>Estado: {estado}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titulo: { color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  mensagem: { fontSize: 20, fontWeight: '600', marginBottom: 30 },
  trilha: {
    width: LARGURA_TRILHA,
    height: TAMANHO_BOLA + 10,
    backgroundColor: '#333',
    borderRadius: 30,
    justifyContent: 'center',
  },
  marcaCentral: {
    position: 'absolute',
    left: LARGURA_TRILHA / 2 - 1,
    width: 2,
    height: '100%',
    backgroundColor: '#888',
  },
  bola: {
    position: 'absolute',
    width: TAMANHO_BOLA,
    height: TAMANHO_BOLA,
    borderRadius: TAMANHO_BOLA / 2,
    top: 5,
  },
  angulo: { color: '#fff', fontSize: 40, marginTop: 20, marginBottom: 20 },
  dados: { alignSelf: 'stretch', paddingHorizontal: 30 },
  linha: { color: '#ccc', fontSize: 16, marginVertical: 2 },
});
