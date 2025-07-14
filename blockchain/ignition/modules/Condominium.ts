
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CondominiumModule = buildModule("CondominiumModule", (m) => {

  const condominium = m.contract("Condominium");
  const adapter =  m.contract("CondominiumAdapter", [], {
    after: [condominium], //Força o deploy sequencial
  });

  m.call(adapter, "init", [condominium]);

  return { condominium, adapter };
});

export default CondominiumModule;