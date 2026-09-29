import Model from "../model";

class MessageModel extends Model {

    protected static table_name: string = "messages";
    public id!: number;
    public room_id!: number;
    public user_id!: number;
    public content!: string;
    public timestamp!: string;
}

export default MessageModel;
