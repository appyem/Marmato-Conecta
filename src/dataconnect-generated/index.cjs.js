const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'conecta-marmato',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const listAllVehiclesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllVehicles');
}
listAllVehiclesRef.operationName = 'ListAllVehicles';
exports.listAllVehiclesRef = listAllVehiclesRef;

exports.listAllVehicles = function listAllVehicles(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllVehiclesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getCitizenProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetCitizenProfile', inputVars);
}
getCitizenProfileRef.operationName = 'GetCitizenProfile';
exports.getCitizenProfileRef = getCitizenProfileRef;

exports.getCitizenProfile = function getCitizenProfile(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getCitizenProfileRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createInfractionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateInfraction', inputVars);
}
createInfractionRef.operationName = 'CreateInfraction';
exports.createInfractionRef = createInfractionRef;

exports.createInfraction = function createInfraction(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createInfractionRef(dcInstance, inputVars));
}
;

const recordPaymentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordPayment', inputVars);
}
recordPaymentRef.operationName = 'RecordPayment';
exports.recordPaymentRef = recordPaymentRef;

exports.recordPayment = function recordPayment(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordPaymentRef(dcInstance, inputVars));
}
;
