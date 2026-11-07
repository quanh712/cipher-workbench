import { WorkspaceErrorBoundary } from "../shared/components/WorkspaceErrorBoundary";
import { PrivacyPolicy } from "../shared/components/PrivacyPolicy";
import { getHistoryStorageWarning } from "../features/history/services/browserHistory";
import { ServerWaitStatus } from "../shared/components/ServerWaitStatus";
import { useDiffieHellman } from "../features/diffieHellman/hooks/useDiffieHellman";
import type { DiffieHellmanGateway } from "../features/diffieHellman/services/diffieHellmanGateway";
import { desApi } from "../features/des/services/desApi";
import { useDesCipher } from "../features/des/hooks/useDesCipher";
import { rsaApi } from "../features/rsa/services/rsaApi";
import { useRsaCipher } from "../features/rsa/hooks/useRsaCipher";
import { createDesDemoGateway } from "../features/des/demo/createDesDemoGateway";
import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useAffineCipher } from "../features/affine/hooks/useAffineCipher";
import { affineApi } from "../features/affine/services/affineApi";
import { CaesarWorkspace } from "../features/caesar/components/CaesarWorkspace";
import { useCaesarCipher } from "../features/caesar/hooks/useCaesarCipher";
import { useColumnarCipher } from "../features/columnar/hooks/useColumnarCipher";
import { columnarApi } from "../features/columnar/services/columnarApi";
import { useHillCipher } from "../features/hill/hooks/useHillCipher";
import { hillApi } from "../features/hill/services/hillApi";
import { usePlayfairCipher } from "../features/playfair/hooks/usePlayfairCipher";
import { useVigenereCipher } from "../features/vigenere/hooks/useVigenereCipher";
import type { VerificationDraft } from "../features/history/services/signatureHistoryApi";
import { CipherAlgorithmSelector } from "../shared/components/CipherAlgorithmSelector";
import { AppHeader } from "../shared/components/AppHeader";
import { CipherMark } from "../shared/components/CipherMark";
import { WorkbenchBackground } from "../shared/components/WorkbenchBackground";
import { getCipherAlgorithms } from "../shared/config/cipherAlgorithms";
import type { CipherAlgorithm } from "../shared/types/cipher";

const DiffieHellmanWorkspace = lazy(() =>
  import("../features/diffieHellman/components/DiffieHellmanWorkspace").then((module) => ({
    default: module.DiffieHellmanWorkspace,
  })),
);
const DesWorkspace = lazy(() =>
  import("../features/des/components/DesWorkspace").then((module) => ({
    default: module.DesWorkspace,
  })),
);
const AffineWorkspace = lazy(() =>
  import("../features/affine/components/AffineWorkspace").then((module) => ({
    default: module.AffineWorkspace,
  })),
);
const ColumnarWorkspace = lazy(() =>
  import("../features/columnar/components/ColumnarWorkspace").then((module) => ({
    default: module.ColumnarWorkspace,
  })),
);
const HillWorkspace = lazy(() =>
  import("../features/hill/components/HillWorkspace").then((module) => ({
    default: module.HillWorkspace,
  })),
);
const PlayfairWorkspace = lazy(() =>
  import("../features/playfair/components/PlayfairWorkspace").then((module) => ({
    default: module.PlayfairWorkspace,
  })),
);
const VigenereWorkspace = lazy(() =>
  import("../features/vigenere/components/VigenereWorkspace").then((module) => ({
    default: module.VigenereWorkspace,
  })),
);
const RsaWorkspace = lazy(() =>
  import("../features/rsa/components/RsaWorkspace").then((module) => ({
    default: module.RsaWorkspace,
  })),
);
const HistoryWorkspace = lazy(() =>
  import("../features/history/components/HistoryWorkspace").then((module) => ({
    default: module.HistoryWorkspace,
  })),
);

const desGateway =
  import.meta.env.VITE_ENABLE_DES === "true"
    ? desApi
    : import.meta.env.VITE_ENABLE_DES_DEMO === "true"
      ? createDesDemoGateway()
      : null;

export function App({
  diffieHellmanGateway = null,
}: { diffieHellmanGateway?: DiffieHellmanGateway | null } = {}) {
  const [storageWarning, setStorageWarning] = useState(getHistoryStorageWarning);
  useEffect(() => {
    const update = () => setStorageWarning(getHistoryStorageWarning());
    window.addEventListener("browser-history-change", update);
    return () => window.removeEventListener("browser-history-change", update);
  }, []);
  const cipher = useCaesarCipher();
  const vigenere = useVigenereCipher();
  const playfair = usePlayfairCipher();
  const affine = useAffineCipher(affineApi);
  const columnar = useColumnarCipher(columnarApi);
  const [algorithm, setAlgorithm] = useState<CipherAlgorithm>("caesar");
  const [verification, setVerification] = useState<VerificationDraft | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const hill = useHillCipher(hillApi, algorithm === "hill" && !showHistory);
  const des = useDesCipher(desGateway, algorithm === "des" && !showHistory);
  const rsa = useRsaCipher(rsaApi, algorithm === "rsa" && !showHistory);
  const diffieHellman = useDiffieHellman(
    import.meta.env.VITE_ENABLE_DIFFIE_HELLMAN === "true" ? diffieHellmanGateway : null,
    algorithm === "diffie-hellman" && !showHistory,
  );
  const hillOpened = useRef(false);
  const [opened, setOpened] = useState<CipherAlgorithm[]>(["caesar"]);
  const [resetVersion, setResetVersion] = useState(0);
  const [reuseVersion, setReuseVersion] = useState(0);
  const cipherAlgorithms = getCipherAlgorithms();
  const historyAvailable = true;
  const isLoading =
    cipher.isLoading ||
    vigenere.isLoading ||
    playfair.isLoading ||
    affine.isBusy ||
    columnar.isBusy ||
    hill.isBusy ||
    des.isBusy;

  function resetWorkspace() {
    setOpened(["caesar"]);
    setResetVersion((n) => n + 1);
    setVerification(undefined);
    setShowHistory(false);
    setAlgorithm("caesar");
    cipher.resetAll();
    vigenere.resetAll();
    playfair.resetAll();
    affine.resetAll();
    columnar.resetAll();
    hill.resetAll();
    des.resetAll();
    rsa.resetAll();
    diffieHellman.resetAll();
    hillOpened.current = false;
  }

  function changeAlgorithm(nextAlgorithm: CipherAlgorithm) {
    if (isLoading || nextAlgorithm === algorithm) return;
    setVerification(undefined);
    setOpened((current) =>
      current.includes(nextAlgorithm) ? current : [...current, nextAlgorithm],
    );
    if (nextAlgorithm === "hill" && !hillOpened.current) {
      const drafts = { caesar: cipher, vigenere, playfair, affine, columnar, des };
      const current =
        algorithm === "hill" || algorithm === "rsa" || algorithm === "diffie-hellman"
          ? null
          : drafts[algorithm];
      hill.seedText(current?.inputType === "text" ? current.text : "");
      hillOpened.current = true;
    }
    setAlgorithm(nextAlgorithm);
  }

  const workspaces: Record<CipherAlgorithm, ReactNode> = {
    caesar: <CaesarWorkspace cipher={cipher} />,
    playfair: <PlayfairWorkspace cipher={playfair} />,
    vigenere: <VigenereWorkspace cipher={vigenere} />,
    affine: <AffineWorkspace cipher={affine} />,
    columnar: <ColumnarWorkspace cipher={columnar} />,
    hill: <HillWorkspace cipher={hill} />,
    des: <DesWorkspace cipher={des} />,
    rsa: <RsaWorkspace key={reuseVersion} cipher={rsa} verification={verification} />,
    "diffie-hellman": <DiffieHellmanWorkspace cipher={diffieHellman} />,
  };

  return (
    <>
      <WorkbenchBackground />
      <AppHeader disabled={isLoading} onReset={resetWorkspace} />
      <main className="page">
        <header className="hero">
          <WorkbenchBackground variant="hex" />
          <div className="hero__title">
            <h1 className="brand-lockup">
              <CipherMark busy={isLoading || diffieHellman.isBusy} />
              <span>Mã hóa &amp; giải mã</span>
            </h1>
          </div>
          <p>
            {algorithm === "diffie-hellman"
              ? "Khám phá cách hai bên thiết lập cùng một bí mật chung với Diffie–Hellman."
              : algorithm === "rsa"
                ? "Khám phá cách RSA sinh khóa và biến đổi từng khối số."
                : "Chọn thuật toán, nhập văn bản hoặc tải file để bắt đầu."}
          </p>
        </header>
        <div className="workspace">
          <ServerWaitStatus />
          {storageWarning && (
            <p role="alert">{storageWarning} Hãy sao chép hoặc tải kết quả để giữ lại.</p>
          )}
          {historyAvailable && (
            <div className="view-switch" role="group" aria-label="Khu vực làm việc">
              <button
                type="button"
                className={!showHistory ? "view-switch__active" : ""}
                aria-pressed={!showHistory}
                onClick={() => setShowHistory(false)}
              >
                Công cụ
              </button>
              <button
                type="button"
                className={showHistory ? "view-switch__active" : ""}
                aria-pressed={showHistory}
                onClick={() => {
                  setVerification(undefined);
                  setShowHistory(true);
                }}
              >
                Lịch sử thao tác
              </button>
            </div>
          )}
          {showHistory && historyAvailable && (
            <WorkspaceErrorBoundary>
              <Suspense fallback={<p role="status">Đang tải lịch sử…</p>}>
                <HistoryWorkspace
                  onReuse={(draft) => {
                    rsa.setKeySource("manual");
                    rsa.setManualKey("n", draft.n);
                    rsa.setManualKey("e", draft.e);
                    rsa.setManualKey("d", "");
                    setVerification(draft);
                    setReuseVersion((n) => n + 1);
                    setOpened((current) =>
                      current.includes("rsa") ? current : [...current, "rsa"],
                    );
                    setAlgorithm("rsa");
                    setShowHistory(false);
                  }}
                />
              </Suspense>
            </WorkspaceErrorBoundary>
          )}
          <div hidden={showHistory}>
            <CipherAlgorithmSelector
              value={algorithm}
              disabled={isLoading}
              onChange={changeAlgorithm}
            />
            {[...cipherAlgorithms]
              .sort((a, b) => Number(b.value === algorithm) - Number(a.value === algorithm))
              .map(({ value: panelAlgorithm }) => (
                <div
                  id={`algorithm-panel-${panelAlgorithm}`}
                  key={`${panelAlgorithm}-${resetVersion}`}
                  role="tabpanel"
                  aria-labelledby={`algorithm-tab-${panelAlgorithm}`}
                  hidden={algorithm !== panelAlgorithm}
                >
                  <WorkspaceErrorBoundary>
                    <Suspense fallback={<p role="status">Đang tải giao diện…</p>}>
                      {algorithm === panelAlgorithm ||
                      (["rsa", "diffie-hellman"].includes(panelAlgorithm) &&
                        opened.includes(panelAlgorithm))
                        ? workspaces[panelAlgorithm]
                        : null}
                    </Suspense>
                  </WorkspaceErrorBoundary>
                </div>
              ))}
          </div>
        </div>
      </main>
      <PrivacyPolicy />
    </>
  );
}
