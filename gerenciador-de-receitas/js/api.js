// OBTER os dados. Só isso. Nenhuma linha aqui toca o DOM.
export async function carregarDados() {
  let resposta;
  try { resposta = await fetch("dados.json"); }
  catch (falha) { const erro = new Error("Não houve resposta do servidor.", { cause: falha }); erro.name = "NetworkError"; throw erro; }
  if (!resposta.ok) { const erro = new Error(`O servidor respondeu com o status ${resposta.status}.`); erro.name = "HttpError"; erro.status = resposta.status; throw erro; }
  const json = await resposta.json();
  if (!json || !Array.isArray(json.ingredientes) || !Array.isArray(json.receitas)) throw new SyntaxError("O JSON não tem as chaves ingredientes e receitas.");
  return json;
}

// Preferências da pessoa (notas e receitas próprias). Falha em silêncio:
// navegação privada ou armazenamento bloqueado nunca quebram a página.
const CHAVE = "panela-retro-v1";
export function lerPreferencias() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; }
}
export function salvarPreferencias(obj) {
  try { localStorage.setItem(CHAVE, JSON.stringify(obj)); } catch { /* sem armazenamento: segue sem salvar */ }
}
