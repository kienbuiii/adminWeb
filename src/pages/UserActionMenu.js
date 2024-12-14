import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import apiConfig from "../apiconfig";
import { Button } from "../components/ui/Button";
import { MoreVertical, MessageCircle, UserX, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom"; 

const UserActionMenu = ({ userId, username }) => {
  const location = useLocation();
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDisabled, setIsDisabled] = useState(location.state?.isDisabled || false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const response = await fetch(`${apiConfig.baseURL}${apiConfig.endpoints.getUserStatus(userId)}`, {
          method: "POST",
          headers: {
            ...apiConfig.headers,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ userId })
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch user status');
        }
  
        const result = await response.json();
        setIsDisabled(result.isDisabled);
      } catch (error) {
        console.error("Error fetching user status:", error);
      }
    };
  
    if (location.state?.isDisabled !== undefined) {
      setIsDisabled(location.state.isDisabled);
    } else if (userId) {
      fetchUserStatus();
    }
  }, [userId, location.state]);

  const handleMessage = () => {
    console.log("Send message to:", userId);
  };

  const handleDisableAccount = async () => {
    try {
      const endpoint = isDisabled
        ? apiConfig.endpoints.enableUser(userId)
        : apiConfig.endpoints.disableUser(userId);

      const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          ...apiConfig.headers,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(isDisabled ? "Failed to enable account" : "Failed to disable account");
      }

      const result = await response.json();
      const newDisabledState = !isDisabled;
      setIsDisabled(newDisabledState);
      setSuccessMessage(newDisabledState ? "Tài khoản đã bị vô hiệu hóa!" : "Tài khoản đã được kích hoạt lại!");
      setShowDisableDialog(false);

      navigate("/admin/users", { replace: true });
    } catch (error) {
      console.error("Error changing account status:", error);
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (username === "admin") {
      alert("Không thể xóa tài khoản admin!");
      return;
    }
  
    try {
      const response = await fetch(`${apiConfig.baseURL}${apiConfig.endpoints.deleteUser(userId)}`, {
        method: 'DELETE',  // Đảm bảo phương thức là DELETE
        headers: apiConfig.headers,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error('Failed to delete account', errorData);
      }
  
      const result = await response.json();
      console.log("Delete account successful:", result);
      
      setShowDeleteDialog(false);  // Đóng dialog sau khi xóa thành công
      setSuccessMessage("Tài khoản đã bị xóa thành công!");  // Hiển thị thông báo thành công
      navigate("/admin/users");
  
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(`Error: ${error.message}`);
    }
  };
  

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 shadow-lg bg-white rounded-md">
         
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDisableDialog(true)}
            className={`flex items-center ${
              isDisabled 
                ? "text-green-700 hover:bg-green-100" 
                : "text-yellow-700 hover:bg-yellow-100"
            } px-4 py-2 rounded-md`}
          >
            <UserX className={`mr-2 h-5 w-5 ${
              isDisabled ? "text-green-500" : "text-yellow-500"
            }`} />
            {isDisabled ? "Hủy vô hiệu hóa" : "Vô hiệu hóa tài khoản"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center text-red-700 hover:bg-red-100 px-4 py-2 rounded-md"
          >
            <Trash2 className="mr-2 h-5 w-5 text-red-500" />
            Xóa tài khoản
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-700 px-4 py-2 rounded-md shadow-md">
          {successMessage}
        </div>
      )}

      {/* Disable Account Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={isDisabled ? "text-green-700" : "text-yellow-700"}>
              <UserX className={`mr-2 inline h-6 w-6 ${
                isDisabled ? "text-green-500" : "text-yellow-500"
              }`} />
              {isDisabled ? "Hủy vô hiệu hóa" : "Vô hiệu hóa tài khoản"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {isDisabled
                ? `Bạn có chắc chắn muốn hủy vô hiệu hóa tài khoản của ${username}?`
                : `Bạn có chắc chắn muốn vô hiệu hóa tài khoản của ${username}? Người dùng sẽ không thể đăng nhập cho đến khi được kích hoạt lại.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableAccount}
              className={isDisabled ? "bg-green-500 hover:bg-green-600 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-white"}
            >
              {isDisabled ? "Hủy vô hiệu hóa" : "Vô hiệu hóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">
              <Trash2 className="mr-2 inline h-6 w-6 text-red-500" />
              Xóa tài khoản
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Bạn có chắc chắn muốn xóa tài khoản của <strong>{username}</strong>? 
              Hành động này không thể hoàn tác và tất cả dữ liệu sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserActionMenu;
