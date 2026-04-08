import { ListAllVehiclesData, GetCitizenProfileData, GetCitizenProfileVariables, CreateInfractionData, CreateInfractionVariables, RecordPaymentData, RecordPaymentVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllVehicles(options?: useDataConnectQueryOptions<ListAllVehiclesData>): UseDataConnectQueryResult<ListAllVehiclesData, undefined>;
export function useListAllVehicles(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllVehiclesData>): UseDataConnectQueryResult<ListAllVehiclesData, undefined>;

export function useGetCitizenProfile(vars: GetCitizenProfileVariables, options?: useDataConnectQueryOptions<GetCitizenProfileData>): UseDataConnectQueryResult<GetCitizenProfileData, GetCitizenProfileVariables>;
export function useGetCitizenProfile(dc: DataConnect, vars: GetCitizenProfileVariables, options?: useDataConnectQueryOptions<GetCitizenProfileData>): UseDataConnectQueryResult<GetCitizenProfileData, GetCitizenProfileVariables>;

export function useCreateInfraction(options?: useDataConnectMutationOptions<CreateInfractionData, FirebaseError, CreateInfractionVariables>): UseDataConnectMutationResult<CreateInfractionData, CreateInfractionVariables>;
export function useCreateInfraction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateInfractionData, FirebaseError, CreateInfractionVariables>): UseDataConnectMutationResult<CreateInfractionData, CreateInfractionVariables>;

export function useRecordPayment(options?: useDataConnectMutationOptions<RecordPaymentData, FirebaseError, RecordPaymentVariables>): UseDataConnectMutationResult<RecordPaymentData, RecordPaymentVariables>;
export function useRecordPayment(dc: DataConnect, options?: useDataConnectMutationOptions<RecordPaymentData, FirebaseError, RecordPaymentVariables>): UseDataConnectMutationResult<RecordPaymentData, RecordPaymentVariables>;
