import ProfilePicture from "../ui/profile-picture";
import {BACKEND_URL} from '@/helpers/info';
import Api from '@/helpers/axios';
import {useUser} from '@/contexts/user-provider';
import {SecurityCheck} from '@/helpers/types';


export default function Picture({setError, setSuccess}: SecurityCheck) {
	const {user, setUser} = useUser();

	if (!user)
      throw new Error("User doesnt exist");

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    	if (e.target.files && e.target.files[0])
      		uploadPicture(e.target.files[0]);
  	};

  	const uploadPicture = async (file: File) => {
    	setError(null);
    	try {
      		const formData = new FormData();
      		formData.append('avatar', file);
			const response = await Api.post('/user/modify/avatar', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			});
			if (response.data && response.data.details) {
				const updatedUser = {
					...user,
					avatar_url: `${response.data.details.avatar_url}?v=${Date.now()}`
				};
      			setUser(updatedUser);
      			setError(null);
      			setSuccess('Profile picture updated successfully');
      			setTimeout(() => setSuccess(null), 2000);
    		}
    	} catch (err: any) {
      		console.error('Error uploading picture:', err);
      		if (err.response?.data?.error)
        		setError(err.response.data.error);
      		else if (err.message)
        		setError(`Upload failed: ${err.message}`);
      		else
        		setError('Error uploading picture');
    	}
	};

	return (
		<div className="flex-shrink-0 flex flex-col items-center justify-center mb-8 md:mb-0 md:mr-12">
			<ProfilePicture height="192px" width="192px" img={`${BACKEND_URL}${user.avatar_url}`}/>
			<p className='mt-6 text-xl font-bold text-white drop-shadow'>{user.username}</p>
			<label className="mt-4 text-base font-semibold bg-blue-500 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-600 transition cursor-pointer">
				Change Picture
				<input
					type="file"
					accept="image/png, image/jpeg"
					style={{ display: 'none' }}
					onChange={handleFileChange}
				/>
			</label>
		</div>
	)
}

