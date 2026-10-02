# Plúvio — Calculadora de Calhas

Frontend React para verificação hidráulica preliminar de calhas conforme a ABNT NBR 10844:1989.

## Execução

```bash
npm install
npm run dev
```

O Vite disponibiliza a aplicação em `http://localhost:5173`.

## Validação

```bash
npm run lint
npm run build
```

## Escopo atual

- postos pluviométricos e períodos de retorno da Tabela 5;
- alternativa simplificada de 150 mm/h para áreas elegíveis;
- área de contribuição de cobertura inclinada;
- perfis retangular, semicircular, trapezoidal e triangular;
- capacidade pela fórmula de Manning-Strickler;
- rugosidades da Tabela 2 e fatores de curva da Tabela 1;
- memorial de cálculo exportado em PDF.

Os cálculos estão isolados em `src/domain` e são acessados por `src/services/calculation-service.ts`. Esse contrato deverá ser substituído pela chamada à API FastAPI sem alterar os componentes da interface.

O dimensionamento de condutores verticais por ábaco e a persistência de projetos não fazem parte desta etapa. Os resultados devem ser validados por profissional habilitado.