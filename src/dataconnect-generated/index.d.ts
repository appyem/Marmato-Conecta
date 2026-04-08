import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Campaign_Key {
  id: UUIDString;
  __typename?: 'Campaign_Key';
}

export interface Citizen_Key {
  id: UUIDString;
  __typename?: 'Citizen_Key';
}

export interface CreateInfractionData {
  infraction_insert: Infraction_Key;
}

export interface CreateInfractionVariables {
  type: string;
  dateIssued: TimestampString;
  amount: number;
  status: string;
  vehicleId?: UUIDString | null;
}

export interface GetCitizenProfileData {
  citizen?: {
    id: UUIDString;
    firstName: string;
    lastName: string;
    documentId: string;
    address?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    createdAt: TimestampString;
    vehicles_on_owner: ({
      id: UUIDString;
      licensePlate: string;
      make: string;
      model: string;
      year: number;
    } & Vehicle_Key)[];
      payments_on_citizen: ({
        id: UUIDString;
        amount: number;
        datePaid: TimestampString;
        method: string;
      } & Payment_Key)[];
  } & Citizen_Key;
}

export interface GetCitizenProfileVariables {
  citizenId: UUIDString;
}

export interface Infraction_Key {
  id: UUIDString;
  __typename?: 'Infraction_Key';
}

export interface ListAllVehiclesData {
  vehicles: ({
    id: UUIDString;
    licensePlate: string;
    make: string;
    model: string;
    year: number;
    color?: string | null;
    vin?: string | null;
    owner?: {
      firstName: string;
      lastName: string;
    };
  } & Vehicle_Key)[];
}

export interface Payment_Key {
  id: UUIDString;
  __typename?: 'Payment_Key';
}

export interface RecordPaymentData {
  payment_insert: Payment_Key;
}

export interface RecordPaymentVariables {
  amount: number;
  datePaid: TimestampString;
  method: string;
  citizenId?: UUIDString | null;
  infractionId?: UUIDString | null;
  campaignId?: UUIDString | null;
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Vehicle_Key {
  id: UUIDString;
  __typename?: 'Vehicle_Key';
}

interface ListAllVehiclesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllVehiclesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllVehiclesData, undefined>;
  operationName: string;
}
export const listAllVehiclesRef: ListAllVehiclesRef;

export function listAllVehicles(options?: ExecuteQueryOptions): QueryPromise<ListAllVehiclesData, undefined>;
export function listAllVehicles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllVehiclesData, undefined>;

interface GetCitizenProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCitizenProfileVariables): QueryRef<GetCitizenProfileData, GetCitizenProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCitizenProfileVariables): QueryRef<GetCitizenProfileData, GetCitizenProfileVariables>;
  operationName: string;
}
export const getCitizenProfileRef: GetCitizenProfileRef;

export function getCitizenProfile(vars: GetCitizenProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetCitizenProfileData, GetCitizenProfileVariables>;
export function getCitizenProfile(dc: DataConnect, vars: GetCitizenProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetCitizenProfileData, GetCitizenProfileVariables>;

interface CreateInfractionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateInfractionVariables): MutationRef<CreateInfractionData, CreateInfractionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateInfractionVariables): MutationRef<CreateInfractionData, CreateInfractionVariables>;
  operationName: string;
}
export const createInfractionRef: CreateInfractionRef;

export function createInfraction(vars: CreateInfractionVariables): MutationPromise<CreateInfractionData, CreateInfractionVariables>;
export function createInfraction(dc: DataConnect, vars: CreateInfractionVariables): MutationPromise<CreateInfractionData, CreateInfractionVariables>;

interface RecordPaymentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordPaymentVariables): MutationRef<RecordPaymentData, RecordPaymentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RecordPaymentVariables): MutationRef<RecordPaymentData, RecordPaymentVariables>;
  operationName: string;
}
export const recordPaymentRef: RecordPaymentRef;

export function recordPayment(vars: RecordPaymentVariables): MutationPromise<RecordPaymentData, RecordPaymentVariables>;
export function recordPayment(dc: DataConnect, vars: RecordPaymentVariables): MutationPromise<RecordPaymentData, RecordPaymentVariables>;

