
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CondominiumModule = buildModule("CondominiumModule", (m) => {

  const protoCoin = m.contract("Condominium");

  return { protoCoin };
});

export default CondominiumModule;