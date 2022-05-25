import { useState } from 'react';
import produce from 'immer';

import VirtualMachineModel from '@kubevirt-ui/kubevirt-api/console/models/VirtualMachineModel';
import { V1VirtualMachine } from '@kubevirt-ui/kubevirt-api/kubevirt';
import { createVmSSHSecret } from '@kubevirt-utils/components/CloudinitModal/utils/cloudinit-utils';
import { createSysprepConfigMap } from '@kubevirt-utils/components/SysprepModal/sysprep-utils';
import { addUploadDataVolumeOwnerReference } from '@kubevirt-utils/hooks/useCDIUpload/utils';
import { k8sCreate, k8sDelete } from '@openshift-console/dynamic-plugin-sdk';

import { produceVMSSHKey, produceVMSysprep, useWizardVMContext } from './WizardVMContext';

type CreateVMArguments = {
  startVM: boolean;
  onFullfilled: (vm: V1VirtualMachine) => void;
};

type UseWizardVmCreateValues = {
  createVM: ({ startVM, onFullfilled }: CreateVMArguments) => Promise<void>;
  loaded: boolean;
  error: any;
};

export const useWizardVmCreate = (): UseWizardVmCreateValues => {
  const { vm, tabsData } = useWizardVMContext();
  const [loaded, setLoaded] = useState<boolean>(true);
  const [error, setError] = useState<any>();
  const [isVmCreated, setIsVmCreated] = useState<boolean>(false);

  const createVM = async ({ startVM, onFullfilled }: CreateVMArguments) => {
    try {
      setLoaded(false);
      setError(undefined);

      const sshKey = tabsData?.scripts?.cloudInit?.sshKey;
      const hasSysprep =
        tabsData?.scripts?.sysprep?.autounattend || tabsData?.scripts?.sysprep?.unattended;

      const updatedVM = produce(vm, (vmDraft) => {
        vmDraft.spec.running = startVM;

        if (hasSysprep) {
          const produced = produceVMSysprep(vm);
          vmDraft.spec = produced.spec;
        }

        if (sshKey) {
          const produced = produceVMSSHKey(vm);
          vmDraft.spec = produced.spec;
        }
      });

      const newVM = await k8sCreate<V1VirtualMachine>({
        model: VirtualMachineModel,
        data: updatedVM,
      });
      setIsVmCreated(true);

      if (hasSysprep) {
        await createSysprepConfigMap(newVM, tabsData?.scripts?.sysprep);
      }

      if (sshKey) {
        await createVmSSHSecret(newVM, sshKey);
      }

      // add missing ownerReferences to upload data volumes
      if (tabsData?.disks?.dataVolumesToAddOwnerRef?.length > 0) {
        await Promise.all(
          tabsData?.disks?.dataVolumesToAddOwnerRef.map((dv) =>
            addUploadDataVolumeOwnerReference(newVM, dv),
          ),
        );
      }

      setLoaded(true);
      onFullfilled(newVM);
    } catch (e) {
      // vm has been created but other promises failed, we need to delete the vm
      if (isVmCreated) {
        await k8sDelete({
          model: VirtualMachineModel,
          resource: vm,
        });
      }

      setLoaded(true);
      setError(e);
    }
  };

  return {
    createVM,
    loaded,
    error,
  };
};
