
import { H3, Input, Select, FormGroup, Divider } from '../../../components/templates';

export default function HolidayPublicForm({ formData, onChange, users }) {
  return (
    <div className="space-y-6">

      <div>
        <H3 className="mb-4">Général</H3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormGroup label="Date début">
              <Input type="date" name="dateHoliday" value={formData.dateHoliday} onChange={onChange} />
            </FormGroup>

            <FormGroup label="Période">
              <Select name="typePeriode" value={formData.typePeriode} onChange={onChange}>
                <option value="JOURNEE_ENTIERE">Journée entière</option>
                <option value="MATIN">Matin</option>
                <option value="APRES_MIDI">Après-midi</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup label="Label / Description">
            <Input type="text" name="label" value={formData.label} onChange={onChange} />
          </FormGroup>
        </div>
      </div>

      <Divider />

      <div>
        <H3 className="mb-4">Createur</H3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormGroup label="Createur">
            <Select name="fkUser" value={formData.fkUser} onChange={onChange}>
              <option value="">-----</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.lastname || `${u.name} `}</option>)}
            </Select>
          </FormGroup>

        </div>
      </div>

      <Divider />

    </div>
  );
}