# 🎴 Memoria Secuencial - Juego de Cartas

Un juego de memoria donde debes recordar la carta anterior y decidir si la carta actual coincide con ella.

## 🎮 Cómo Jugar

1. Se muestra una carta por 2.5 segundos - ¡Memorízala!
2. La carta se voltea (queda boca abajo)
3. Aparece una nueva carta
4. Decide: ¿Esta carta coincide con la anterior?
   - **Si COINCIDEN**: Presiona **ENTER** (+100 puntos)
   - **Si NO coinciden**: No hagas nada, espera 3 segundos (+100 puntos)
5. La carta actual se voltea y se convierte en la nueva "carta anterior"
6. ¡Repite el proceso!

## ⚠️ Penalizaciones

- Presionar ENTER cuando NO coinciden: **-50 puntos**
- No presionar ENTER cuando SÍ coinciden: **-50 puntos**

## 📊 Niveles

- **Nivel 1**: 15 cartas
- **Nivel 2**: 20 cartas
- **Nivel 3**: 25 cartas
- **Nivel 4**: 30 cartas
- **Nivel 5**: 35 cartas

Completa todas las cartas de un nivel para avanzar al siguiente.

## 🚀 Iniciar el Proyecto

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🛠️ Tecnologías

- **Next.js 15** - Framework de React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Lucide React** - Íconos

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm start` - Construye la aplicación e inicia el servidor de producción (también funciona con `npm run start`)

## 🎯 Características

- ✅ Interfaz intuitiva con un solo botón
- ✅ Temporizador visual de 3 segundos
- ✅ Sistema de puntuación con bonificaciones y penalizaciones
- ✅ 5 niveles progresivos de dificultad
- ✅ Animaciones suaves y retroalimentación visual
- ✅ Diseño responsive

¡Disfruta del juego! 🎉

## ⏸️ Pausa y navegación

- **Pausar / Reanudar** congela el tiempo restante, las cartas y la puntuación. Las respuestas no se aceptan mientras está pausado; al reanudar se conserva el tiempo pendiente.
- **Ir a nivel** permite elegir cualquiera de los cinco niveles. Durante una partida pide confirmar: cambiar reinicia la puntuación; cancelar conserva la partida y su estado de pausa.
- Al terminar los niveles 1–4 aparece un resumen sin límite de tiempo. **Siguiente nivel** continúa conservando los puntos acumulados. Al terminar el nivel 5 se muestra la victoria.
- En móvil se juega tocando el botón verde; en escritorio se mantienen ESPACIO y ENTER. Los selectores y botones conservan su comportamiento nativo de teclado.

### Pruebas de navegador

Con Playwright instalado externamente, ejecutar contra la URL desplegada (o definir `TEST_URL`):

```bash
PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/check-responsive.cjs
PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/check-controls.cjs
```

La segunda prueba completa un nivel con temporizadores reales tanto en móvil emulado como en escritorio. No sustituye una prueba en un iPhone físico.

### Movimiento de cartas

El traspaso de 450 ms mueve el reverso de la carta actual a la posición anterior y hace entrar la siguiente boca abajo. Solo al terminar se revela la nueva carta y comienza su ventana de respuesta de 3 segundos. La memorización inicial sigue durando 2,5 segundos. Pausar también congela la animación; las posiciones se calculan con las dimensiones reales del tablero. Con movimiento reducido se usa una transición de opacidad.

```bash
PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/check-motion.cjs
```

Esta prueba registra vídeos en `/tmp/memory-cards-motion-videos`, mide posiciones/escala/opacidad en frames consecutivos y comprueba pausa a mitad del movimiento, coincidencias/no coincidencias y cambios de nivel en 320/375/390/430 px y escritorio.
