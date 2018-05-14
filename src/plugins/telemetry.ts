export interface Telemetry {
  data: any;
}

const DYFACTOR_GLOBAL = `window.__dyfactor_telemetry`;

export default class TelemetryBuilder {
  global = DYFACTOR_GLOBAL;

  preamble() {
    return `
      if (!${DYFACTOR_GLOBAL}) {
        ${DYFACTOR_GLOBAL} = {};
      }
    `;
  }

  path(key: string) {
    return `${DYFACTOR_GLOBAL}[${key}]`;
  }

  conditionallyAdd(key: string, consequence: () => string, alternative: () => string) {
    return `
      if (${DYFACTOR_GLOBAL}[${key}]) {
        ${consequence()}
      } else {
        ${alternative()}
      }
    `;
  }
}
