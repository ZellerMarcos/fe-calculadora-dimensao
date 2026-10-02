# Plúvio — Calculadora de Calhas

Frontend React para verificação hidráulica preliminar de calhas conforme a ABNT NBR 10844:1989.

## Execução

Inicie a API primeiro, seguindo as instruções de `../be-calculadora-dimensao/README.md`.

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

- postos pluviométricos e intensidades carregados da API (Tabela 5 versionada no backend);
- alternativa simplificada de 150 mm/h para áreas elegíveis;
- área para superfícies planas/inclinadas e saída na extremidade/central;
- perfis retangular, semicircular e trapezoidal;
- verificação calculada exclusivamente pela API FastAPI;
- rugosidades e materiais carregados da API;
- memorial JSON ou DOCX, recalculado e gerado no backend.

Durante o desenvolvimento, o Vite encaminha as chamadas `/api` para `http://127.0.0.1:8000`.

O dimensionamento de condutores verticais por ábaco e a persistência de projetos não fazem parte desta etapa. Os resultados devem ser validados por profissional habilitado.