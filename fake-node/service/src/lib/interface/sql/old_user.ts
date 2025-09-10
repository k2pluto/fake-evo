import { Entity } from 'typeorm'

import { User } from './user'
// import * as argon2 from "argon2";

@Entity('info_old_user')
export class OldUser extends User {}
