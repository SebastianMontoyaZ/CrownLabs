import { Modal, Input, Button } from 'antd';
import { useState } from 'react';

interface ModalAddTemplateYamlProps {
  visible: boolean;
  onCancel: () => void;
  onAdd: (yaml: string) => void;
}

const ModalAddTemplateYaml: React.FC<ModalAddTemplateYamlProps> = ({
  visible,
  onCancel,
  onAdd,
}) => {
  const [yaml, setYaml] = useState('');
  return (
    <Modal
      title="Add Template (YAML)"
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="add" type="primary" onClick={() => onAdd(yaml)}>
          Add
        </Button>,
      ]}
    >
      <Input.TextArea
        rows={12}
        value={yaml}
        onChange={e => setYaml(e.target.value)}
        placeholder="Paste your Template YAML here"
      />
    </Modal>
  );
};

export default ModalAddTemplateYaml;
