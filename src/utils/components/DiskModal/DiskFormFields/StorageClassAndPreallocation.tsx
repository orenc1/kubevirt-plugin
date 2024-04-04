import React, { FC, useMemo } from 'react';

import ApplyStorageProfileSettingsCheckbox from '@kubevirt-utils/components/ApplyStorageProfileSettingsCheckbox/ApplyStorageProfileSettingsCheckbox';
import { isEmpty } from '@kubevirt-utils/utils/utils';
import { Flex, FlexItem } from '@patternfly/react-core';

import { diskReducerActions, DiskReducerActionType } from '../state/actions';
import { DiskFormState } from '../state/initialState';
import { requiresDataVolume } from '../utils/helpers';

import useStorageProfileClaimPropertySets from './hooks/useStorageProfileClaimPropertySets';
import AlertedStorageClassSelect from './StorageClass/AlertedStorageClassSelect';
import { sourceTypes } from './utils/constants';
import AccessMode from './AccessMode';
import EnablePreallocationCheckbox from './EnablePreallocationCheckbox';
import VolumeMode from './VolumeMode';

import './storage-class-and-preallocation.scss';

type StorageClassAndPreallocationProps = {
  checkSC?: (selectedStorageClass: string) => boolean;
  diskState: DiskFormState;
  dispatchDiskState: React.Dispatch<DiskReducerActionType>;
};

const StorageClassAndPreallocation: FC<StorageClassAndPreallocationProps> = ({
  checkSC,
  diskState,
  dispatchDiskState,
}) => {
  const sourceRequiresDataVolume = useMemo(
    () => requiresDataVolume(diskState.diskSource),
    [diskState.diskSource],
  );

  const { claimPropertySets, loaded: storageProfileLoaded } = useStorageProfileClaimPropertySets(
    diskState?.storageClass,
  );

  if (!sourceRequiresDataVolume && diskState.diskSource !== sourceTypes.UPLOAD) return null;

  const handleApplyOptimizedSettingsChange = (checked: boolean) => {
    dispatchDiskState({
      payload: checked,
      type: diskReducerActions.SET_APPLY_STORAGE_PROFILE_SETTINGS,
    });
    dispatchDiskState({
      payload: claimPropertySets?.[0]?.volumeMode,
      type: diskReducerActions.SET_VOLUME_MODE,
    });
    dispatchDiskState({
      payload: claimPropertySets?.[0]?.accessModes?.[0],
      type: diskReducerActions.SET_ACCESS_MODE,
    });
  };

  return (
    <>
      <AlertedStorageClassSelect
        setStorageClassName={(scName) =>
          dispatchDiskState({ payload: scName, type: diskReducerActions.SET_STORAGE_CLASS })
        }
        setStorageClassProvisioner={(scProvisioner: string) =>
          dispatchDiskState({
            payload: scProvisioner,
            type: diskReducerActions.SET_STORAGE_CLASS_PROVISIONER,
          })
        }
        checkSC={checkSC}
        storageClass={diskState.storageClass}
      />
      <div>
        <ApplyStorageProfileSettingsCheckbox
          claimPropertySets={claimPropertySets}
          disabled={!storageProfileLoaded || !claimPropertySets || isEmpty(claimPropertySets)}
          handleChange={handleApplyOptimizedSettingsChange}
          isChecked={diskState?.applyStorageProfileSettings}
        />
        <Flex
          className="StorageClassAndPreallocation--volume-access-section"
          spaceItems={{ default: 'spaceItems3xl' }}
        >
          <FlexItem>
            <AccessMode
              diskState={diskState}
              dispatchDiskState={dispatchDiskState}
              spAccessMode={claimPropertySets?.[0]?.accessModes?.[0]}
            />
          </FlexItem>
          <FlexItem>
            <VolumeMode
              diskState={diskState}
              dispatchDiskState={dispatchDiskState}
              spVolumeMode={claimPropertySets?.[0]?.volumeMode}
            />
          </FlexItem>
        </Flex>
      </div>
      <EnablePreallocationCheckbox
        dispatchDiskState={dispatchDiskState}
        enablePreallocation={diskState.enablePreallocation}
        isDisabled={!sourceRequiresDataVolume}
      />
    </>
  );
};

export default StorageClassAndPreallocation;
