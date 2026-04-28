// lib/kb/wiki-schema.ts

export const WIKI_SCHEMA = `
# Schema del Wiki Aziendale

## Struttura
Il wiki è composto da pagine Markdown organizzate per categoria.
Ogni pagina ha uno slug univoco (es. "tariffe-nord-sud", "procedura-reclami").

## Categorie standard
- tariffe: prezzi, tariffari, listini per tratta/peso/servizio
- procedure: procedure operative standard, istruzioni interne
- faq: domande frequenti dei clienti con risposte standard
- prodotti: catalogo prodotti o servizi offerti
- contatti: referenti, fornitori, partner
- altro: tutto ciò che non rientra nelle categorie precedenti

## Regole per la manutenzione
1. Ogni pagina deve avere un titolo chiaro e uno slug in kebab-case
2. Usa Markdown: ## per sezioni, **grassetto** per dati importanti, tabelle per dati strutturati
3. Se un nuovo documento contraddice una pagina esistente, aggiorna la pagina e segnala la contraddizione
4. index.md deve sempre essere aggiornato quando crei o aggiorni pagine
5. Non duplicare informazioni tra pagine: usa riferimenti incrociati

## Formato index.md
# Indice Wiki
## [categoria]
- [[slug]]: descrizione in una riga
`

export function buildSchemaPage(companyId: string) {
  return {
    company_id: companyId,
    slug:       'schema',
    title:      'Schema del Wiki',
    content:    WIKI_SCHEMA,
    page_type:  'schema' as const,
    category:   null,
    source_ids: [],
  }
}