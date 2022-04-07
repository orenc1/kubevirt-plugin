import * as React from 'react';
import { TFunction } from 'i18next';

import VirtualMachineModel from '@kubevirt-ui/kubevirt-api/console/models/VirtualMachineModel';
import {
  V1VirtualMachine,
  V1VirtualMachineInstanceMigration,
} from '@kubevirt-ui/kubevirt-api/kubevirt';
import { AnnotationsModal } from '@kubevirt-utils/components/AnnotationsModal/AnnotationsModal';
import { LabelsModal } from '@kubevirt-utils/components/LabelsModal/LabelsModal';
import { ModalComponent } from '@kubevirt-utils/components/ModalProvider/ModalProvider';
import { Action, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';

import { printableVMStatus } from '../utils';

import CloneVMModal from './components/CloneVMModal/CloneVMModal';
import {
  cancelMigration,
  deleteVM,
  migrateVM,
  pauseVM,
  restartVM,
  startVM,
  stopVM,
  unpauseVM,
} from './actions';

const {
  Stopped,
  Migrating,
  Provisioning,
  Starting,
  Running,
  Paused,
  Stopping,
  Terminating,
  Unknown,
} = printableVMStatus;

export const VirtualMachineActionFactory = {
  start: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-start',
      disabled: [
        Starting,
        Stopping,
        Terminating,
        Provisioning,
        Migrating,
        Running,
        Unknown,
      ].includes(vm?.status?.printableStatus),
      label: t('Start'),
      cta: () => startVM(vm),
      //   accessReview: {},
    };
  },
  stop: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-stop',
      disabled: [Starting, Stopping, Terminating, Stopped, Paused, Unknown].includes(
        vm?.status?.printableStatus,
      ),
      label: t('Stop'),
      cta: () => stopVM(vm),
      //   accessReview: {},
    };
  },
  restart: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-restart',
      disabled: [
        Starting,
        Stopping,
        Terminating,
        Provisioning,
        Migrating,
        Stopped,
        Unknown,
      ].includes(vm?.status?.printableStatus),
      label: t('Restart'),
      cta: () => restartVM(vm),
      //   accessReview: {},
    };
  },
  pause: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-pause',
      disabled: vm?.status?.printableStatus !== Running,
      label: t('Pause'),
      cta: () => pauseVM(vm),
      //   accessReview: {},
    };
  },
  unpause: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-unpause',
      disabled: vm?.status?.printableStatus !== Paused,
      label: t('Unpause'),
      cta: () => unpauseVM(vm),
      //   accessReview: {},
    };
  },
  migrate: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-migrate',
      disabled:
        vm?.status?.printableStatus !== Running ||
        !!vm?.status?.conditions?.find(
          ({ type, status }) => type === 'LiveMigratable' && status === 'False',
        ),
      label: t('Migrate node to node'),
      cta: () => migrateVM(vm),
      //   accessReview: {},
    };
  },
  cancelMigration: (
    vm: V1VirtualMachine,
    vmim: V1VirtualMachineInstanceMigration,
    t: TFunction,
  ): Action => {
    return {
      id: 'vm-action-cancel-migrate',
      disabled: vm?.status?.printableStatus !== Migrating,
      label: t('Cancel virtual machine migration'),
      cta: () => cancelMigration(vmim),
      //   accessReview: {},
    };
  },
  clone: (
    vm: V1VirtualMachine,
    createModal: (modal: ModalComponent) => void,
    t: TFunction,
  ): Action => {
    return {
      id: 'vm-action-clone',
      disabled: [Starting, Stopping, Terminating, Provisioning, Migrating, Unknown].includes(
        vm?.status?.printableStatus,
      ),
      label: t('Clone'),
      cta: () =>
        createModal(({ isOpen, onClose }) => (
          <CloneVMModal isOpen={isOpen} onClose={onClose} vm={vm} />
        )),
      //   accessReview: {},
    };
  },
  // console component is needed to allow openConsole action
  // openConsole: (vm: V1VirtualMachine): Action => {
  //   return {
  //     id: 'vm-action-open-console',
  //     disabled: false,
  //     label: 'Open console',
  //     cta: () =>
  //       window.open(
  //         `/k8s/ns/${vm?.metadata?.namespace}/virtualmachineinstances/${vm?.metadata?.name}/standaloneconsole`,
  //         `${vm?.metadata?.name}-console}`,
  //         'modal=yes,alwaysRaised=yes,location=yes,width=1024,height=768',
  //       ),
  //   };
  // },
  editLabels: (
    vm: V1VirtualMachine,
    createModal: (modal: ModalComponent) => void,
    t: TFunction,
  ): Action => {
    return {
      id: 'vm-action-edit-labels',
      disabled: false,
      label: t('Edit labels'),
      cta: () =>
        createModal(({ isOpen, onClose }) => (
          <LabelsModal
            obj={vm}
            isOpen={isOpen}
            onClose={onClose}
            onLabelsSubmit={(labels) =>
              k8sPatch({
                model: VirtualMachineModel,
                resource: vm,
                data: [
                  {
                    op: 'replace',
                    path: '/metadata/labels',
                    value: labels,
                  },
                ],
              })
            }
          />
        )),
    };
  },
  editAnnotations: (
    vm: V1VirtualMachine,
    createModal: (modal: ModalComponent) => void,
    t: TFunction,
  ): Action => {
    return {
      id: 'vm-action-edit-annotations',
      disabled: false,
      label: t('Edit annotations'),
      cta: () =>
        createModal(({ isOpen, onClose }) => (
          <AnnotationsModal
            obj={vm}
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={(updatedAnnotations) =>
              k8sPatch({
                model: VirtualMachineModel,
                resource: vm,
                data: [
                  {
                    op: 'replace',
                    path: '/metadata/annotations',
                    value: updatedAnnotations,
                  },
                ],
              })
            }
          />
        )),
    };
  },
  delete: (vm: V1VirtualMachine, t: TFunction): Action => {
    return {
      id: 'vm-action-delete',
      disabled: false,
      label: t('Delete'),
      cta: () => deleteVM(vm),
    };
  },
};
