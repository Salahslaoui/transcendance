import Model from "../model";

export default class ParticipantsModel extends Model{
	protected static table_name: string = 'participants';
	public user_id!: number;
	public room_id!: number;
}
