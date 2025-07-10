import React from 'react'
import Navbar from '../../components/admin/Navbar'
import SideBar from '../../components/admin/SideBar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import Loading from '../../components/Loading'

const Layout = () => {
  const { isAdmin, fetchIsAdmin } = useAppContext();

  return isAdmin ? (
    <>
      <Navbar/>
      <div className=" flex ">
        <SideBar/>
        <div className=' flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto '>
          <Outlet/>
        </div>
      </div>

    </>
  ): <Loading/>
}

export default Layout
