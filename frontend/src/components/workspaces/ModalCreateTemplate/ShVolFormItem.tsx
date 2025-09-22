import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, Select, Space, Tooltip } from 'antd';
import type { FC } from 'react';
import type { SharedVolume } from '../../../utils';

export interface IShVolFormItemProps {
  parentFormName: number;
  sharedVolumes: SharedVolume[];
}

export interface ShVolFormItemValue {
  shvol: string; // id del volume selezionato
  mountpath: string;
  readonly?: boolean;
}

const fullLayout = {
  wrapperCol: { offset: 0, span: 24 },
};

const ShVolFormItem: FC<IShVolFormItemProps> = ({
  parentFormName,
  sharedVolumes,
}) => {
  return (
    <Form.List name={[parentFormName, 'sharedVolumeMounts']}>
      {(fields, { add, remove }) => (
        <>
          {fields.map(({ key, name, ...restField }) => (
            <Space
              key={key}
              style={{ display: 'flex', marginBottom: 4 }}
              align="baseline"
            >
              <Form.Item
                {...restField}
                name={[name, 'shvol']}
                rules={[{ required: true, message: 'Missing Shared Volume' }]}
              >
                <Select placeholder="Select..." style={{ width: '160px' }}>
                  {sharedVolumes.map(shvol => (
                    <Select.Option key={shvol.id} value={shvol.id}>
                      {shvol.prettyName}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                {...restField}
                name={[name, 'mountpath']}
                rules={[
                  { required: true, message: 'Missing Mount Path' },
                  {
                    validator: (_, value) => {
                      if (!value || value.trim() === '') {
                        return Promise.reject(
                          new Error('Mount Path cannot be empty'),
                        );
                      }
                      if (!/^\/([a-zA-Z0-9_-]+\/?)*$/.test(value)) {
                        return Promise.reject(
                          new Error('Mount Path must be a valid directory'),
                        );
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input
                  placeholder="Example: /mnt/myvol"
                  style={{ width: '170px' }}
                />
              </Form.Item>

              <span> RO: </span>
              <Tooltip title="When checked, the selected Shared Volume will be mounted with Read-Only permissions. Keep in mind that expert users may edit this setting if mounted on a VM.">
                <Form.Item
                  {...restField}
                  name={[name, 'readonly']}
                  valuePropName="checked"
                >
                  <Checkbox />
                </Form.Item>
              </Tooltip>

              <MinusCircleOutlined
                style={{ marginLeft: '50px' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'red')}
                onMouseLeave={e => (e.currentTarget.style.color = '')}
                onClick={() => remove(name)}
              />
            </Space>
          ))}

          <Form.Item {...fullLayout}>
            <Button
              type="dashed"
              onClick={() => add()}
              block
              icon={<PlusOutlined />}
            >
              Mount a Shared Volume
            </Button>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};

export default ShVolFormItem;
